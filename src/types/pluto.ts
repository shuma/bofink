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
