-- Sandbox Pool Table
-- Manages pre-warmed sandboxes for faster cold starts

CREATE TABLE sandbox_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sandbox_id TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL DEFAULT 'warming' CHECK (state IN ('warming', 'ready', 'assigned', 'expired')),
  template_version TEXT NOT NULL,
  assigned_to_project UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ready_at TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- Index for finding sandboxes by state
CREATE INDEX idx_sandbox_pool_state ON sandbox_pool(state);

-- Index for efficiently finding ready sandboxes (sorted by readiness time)
CREATE INDEX idx_sandbox_pool_ready ON sandbox_pool(state, ready_at) WHERE state = 'ready';

-- Index for finding sandboxes by project assignment
CREATE INDEX idx_sandbox_pool_project ON sandbox_pool(assigned_to_project) WHERE assigned_to_project IS NOT NULL;

-- Index for cleanup queries (find expired/stale sandboxes)
CREATE INDEX idx_sandbox_pool_expires ON sandbox_pool(expires_at) WHERE expires_at IS NOT NULL;

-- RLS Policies
ALTER TABLE sandbox_pool ENABLE ROW LEVEL SECURITY;

-- Only service role can manage the pool (not individual users)
-- This table is managed by backend cron jobs and API routes
CREATE POLICY "Service role can manage sandbox pool" ON sandbox_pool
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Allow authenticated users to read pool stats (for admin dashboard)
CREATE POLICY "Authenticated users can view pool stats" ON sandbox_pool
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Function to get pool statistics
CREATE OR REPLACE FUNCTION get_sandbox_pool_stats()
RETURNS TABLE (
  total_count BIGINT,
  warming_count BIGINT,
  ready_count BIGINT,
  assigned_count BIGINT,
  expired_count BIGINT,
  oldest_ready_at TIMESTAMPTZ,
  newest_ready_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_count,
    COUNT(*) FILTER (WHERE state = 'warming')::BIGINT as warming_count,
    COUNT(*) FILTER (WHERE state = 'ready')::BIGINT as ready_count,
    COUNT(*) FILTER (WHERE state = 'assigned')::BIGINT as assigned_count,
    COUNT(*) FILTER (WHERE state = 'expired')::BIGINT as expired_count,
    MIN(ready_at) FILTER (WHERE state = 'ready') as oldest_ready_at,
    MAX(ready_at) FILTER (WHERE state = 'ready') as newest_ready_at
  FROM sandbox_pool;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to acquire a ready sandbox (atomic operation)
CREATE OR REPLACE FUNCTION acquire_sandbox(p_project_id UUID, p_template_version TEXT)
RETURNS TABLE (
  sandbox_id TEXT,
  was_acquired BOOLEAN
) AS $$
DECLARE
  v_sandbox_id TEXT;
BEGIN
  -- Try to acquire a ready sandbox with matching template version
  UPDATE sandbox_pool
  SET
    state = 'assigned',
    assigned_to_project = p_project_id,
    assigned_at = now()
  WHERE id = (
    SELECT id FROM sandbox_pool
    WHERE state = 'ready'
      AND template_version = p_template_version
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY ready_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING sandbox_pool.sandbox_id INTO v_sandbox_id;

  IF v_sandbox_id IS NOT NULL THEN
    RETURN QUERY SELECT v_sandbox_id, TRUE;
  ELSE
    RETURN QUERY SELECT NULL::TEXT, FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to release a sandbox back to the pool
CREATE OR REPLACE FUNCTION release_sandbox(p_sandbox_id TEXT, p_mark_expired BOOLEAN DEFAULT FALSE)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  IF p_mark_expired THEN
    UPDATE sandbox_pool
    SET
      state = 'expired',
      assigned_to_project = NULL
    WHERE sandbox_id = p_sandbox_id
      AND state = 'assigned';
  ELSE
    -- Return to ready state for reuse
    UPDATE sandbox_pool
    SET
      state = 'ready',
      assigned_to_project = NULL,
      assigned_at = NULL,
      ready_at = now()
    WHERE sandbox_id = p_sandbox_id
      AND state = 'assigned';
  END IF;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired/stale sandboxes
CREATE OR REPLACE FUNCTION cleanup_sandbox_pool(p_max_age_minutes INT DEFAULT 30)
RETURNS TABLE (
  cleaned_count BIGINT,
  sandbox_ids TEXT[]
) AS $$
DECLARE
  v_sandbox_ids TEXT[];
BEGIN
  -- Mark old ready sandboxes as expired
  WITH expired AS (
    UPDATE sandbox_pool
    SET state = 'expired'
    WHERE state = 'ready'
      AND ready_at < now() - (p_max_age_minutes || ' minutes')::INTERVAL
    RETURNING sandbox_id
  )
  SELECT array_agg(sandbox_id) INTO v_sandbox_ids FROM expired;

  RETURN QUERY SELECT
    COALESCE(array_length(v_sandbox_ids, 1), 0)::BIGINT,
    COALESCE(v_sandbox_ids, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_sandbox_pool_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION acquire_sandbox(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION release_sandbox(TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_sandbox_pool(INT) TO authenticated;

COMMENT ON TABLE sandbox_pool IS 'Pool of pre-warmed Daytona sandboxes for faster project creation';
COMMENT ON COLUMN sandbox_pool.state IS 'Sandbox lifecycle state: warming (being prepared), ready (available for assignment), assigned (in use by a project), expired (marked for deletion)';
COMMENT ON COLUMN sandbox_pool.template_version IS 'Version of the template used to warm this sandbox (e.g., v1.0.0)';
