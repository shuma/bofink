-- Project memory for persistent context
CREATE TABLE IF NOT EXISTS project_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Core memory blocks
  summary TEXT,                    -- Project summary/overview
  preferences JSONB DEFAULT '{}',  -- User preferences
  decisions JSONB DEFAULT '[]',    -- Architecture decisions with timestamps
  tasks JSONB DEFAULT '[]',        -- Active/completed tasks
  issues JSONB DEFAULT '[]',       -- Known issues with severity
  conventions JSONB DEFAULT '{}',  -- Coding conventions

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id)
);

-- File summaries for smart context loading
CREATE TABLE IF NOT EXISTS file_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,

  -- Summary data
  summary TEXT,                    -- AI-generated summary
  file_type TEXT,                  -- component/page/hook/util/config/etc
  exports JSONB DEFAULT '[]',      -- Exported functions/components
  imports JSONB DEFAULT '[]',      -- Import dependencies
  line_count INTEGER,
  content_hash TEXT,               -- For cache invalidation

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, file_path)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_memory_project_id ON project_memory(project_id);
CREATE INDEX IF NOT EXISTS idx_file_summaries_project_id ON file_summaries(project_id);
CREATE INDEX IF NOT EXISTS idx_file_summaries_path ON file_summaries(project_id, file_path);

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_memory_updated_at
  BEFORE UPDATE ON project_memory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER file_summaries_updated_at
  BEFORE UPDATE ON file_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
