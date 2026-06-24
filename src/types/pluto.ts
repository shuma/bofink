// Project status enum
export type ProjectStatus = 'planning' | 'building' | 'ready' | 'error'

// Generation status enum
export type GenerationStatus =
  | 'pending'
  | 'clarifying'
  | 'planning'
  | 'approved'
  | 'building'
  | 'ready'
  | 'error'

// Clarifying question with options
export interface ClarifyingQuestion {
  id: string
  question: string
  options: {
    label: string
    value: string
  }[]
  multiSelect?: boolean
}

// User's answer to a clarifying question
export interface ClarifyingAnswer {
  questionId: string
  value: string | string[]
}

// Build plan step (from AI generation)
export interface BuildPlanStep {
  id: string
  title: string
  description: string
  type: 'file' | 'command' | 'config'
}

// Build plan step with runtime status (for UI tracking)
export interface BuildPlanStepWithStatus extends BuildPlanStep {
  status: 'pending' | 'in_progress' | 'completed' | 'error'
}

// Build plan
export interface BuildPlan {
  name: string
  description: string
  features: string[]
  techStack: string[]
  steps: BuildPlanStep[]
}

// Project from database
export interface Project {
  id: string
  user_id: string
  name: string
  description: string | null
  prompt: string
  plan: BuildPlan | null
  source: string
  template: string
  daytona_sandbox_id: string | null
  letta_agent_id: string | null
  preview_url: string | null
  preview_expires_at: string | null
  status: ProjectStatus
  created_at: string
  updated_at: string
}

// Generation from database
export interface Generation {
  id: string
  project_id: string
  prompt: string
  clarifying_questions: ClarifyingQuestion[] | null
  clarifying_answers: ClarifyingAnswer[] | null
  plan: BuildPlan | null
  build_output: string | null
  status: GenerationStatus
  created_at: string
}

// Build log entry
export interface BuildLogEntry {
  id: string
  timestamp: string
  type: 'info' | 'command' | 'output' | 'error' | 'success'
  message: string
  step?: string
}

// Ask user request (human-in-the-loop)
export interface AskUserRequest {
  id: string
  question: string
  options?: {
    label: string
    value: string
  }[]
  allowCustom?: boolean
}

// Database message record (maps to messages table)
export interface DBMessage {
  id: string
  project_id: string
  message_id: string
  role: 'system' | 'user' | 'assistant'
  parts: unknown[]
  metadata: unknown | null
  sequence_num: number
  created_at: string
}

// Database build log record (maps to build_logs table)
export interface DBBuildLog {
  id: string
  project_id: string
  message_id: string | null
  type: 'info' | 'command' | 'output' | 'error' | 'success'
  message: string
  step: string | null
  created_at: string
}

// File tree node for code viewer
export interface FileNode {
  name: string
  path: string
  isDir: boolean
  children?: FileNode[]
}

// Open file in code editor
export interface OpenFile {
  path: string
  name: string
  content: string
  language: string
}

// Line selection in code editor
export interface LineSelection {
  filePath: string
  fileName: string
  startLine: number
  endLine: number
}

// ============================================================================
// Project Memory Types
// ============================================================================

// Architecture decision record
export interface DecisionRecord {
  id: string
  decision: string
  rationale: string
  timestamp: string
}

// Task record for tracking work items
export interface TaskRecord {
  id: string
  task: string
  status: 'pending' | 'in_progress' | 'completed'
  timestamp: string
}

// Issue record for tracking known problems
export interface IssueRecord {
  id: string
  issue: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  resolved: boolean
  timestamp: string
}

// Project memory for persistent context
export interface ProjectMemory {
  id: string
  project_id: string
  summary: string | null
  preferences: Record<string, unknown>
  decisions: DecisionRecord[]
  tasks: TaskRecord[]
  issues: IssueRecord[]
  conventions: Record<string, string>
  created_at: string
  updated_at: string
}

// File summary record for smart context loading
export interface FileSummaryRecord {
  id: string
  project_id: string
  file_path: string
  summary: string | null
  file_type: string | null
  exports: string[]
  imports: string[]
  line_count: number | null
  content_hash: string | null
  created_at: string
  updated_at: string
}
