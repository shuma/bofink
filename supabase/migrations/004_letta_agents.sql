-- Letta Agent Integration Migration
-- Adds letta_agent_id to projects for persistent agent memory

-- Add letta_agent_id column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS letta_agent_id TEXT;

-- Create index for efficient lookups by agent ID
CREATE INDEX IF NOT EXISTS idx_projects_letta_agent_id ON projects(letta_agent_id);

-- Add comment for documentation
COMMENT ON COLUMN projects.letta_agent_id IS 'Letta agent ID for persistent memory across sessions';
