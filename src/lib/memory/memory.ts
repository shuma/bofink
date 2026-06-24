import { createAdminClient } from '@/lib/supabase/admin'
import type {
  ProjectMemory,
  DecisionRecord,
  TaskRecord,
  IssueRecord,
} from '@/types/pluto'

/**
 * Get project memory, creating it if it doesn't exist
 */
export async function getProjectMemory(projectId: string): Promise<ProjectMemory> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('project_memory')
    .select('*')
    .eq('project_id', projectId)
    .single()

  if (error && error.code === 'PGRST116') {
    // No memory exists, create one
    return createProjectMemory(projectId)
  }

  if (error) {
    throw new Error(`Failed to get project memory: ${error.message}`)
  }

  return {
    ...data,
    decisions: data.decisions || [],
    tasks: data.tasks || [],
    issues: data.issues || [],
    preferences: data.preferences || {},
    conventions: data.conventions || {},
  } as ProjectMemory
}

/**
 * Create a new project memory record
 */
export async function createProjectMemory(projectId: string): Promise<ProjectMemory> {
  const supabase = createAdminClient()

  const newMemory = {
    project_id: projectId,
    summary: null,
    preferences: {},
    decisions: [],
    tasks: [],
    issues: [],
    conventions: {},
  }

  const { data, error } = await supabase
    .from('project_memory')
    .insert(newMemory)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create project memory: ${error.message}`)
  }

  return data as ProjectMemory
}

/**
 * Update the project summary
 */
export async function updateProjectSummary(
  projectId: string,
  summary: string
): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('project_memory')
    .update({ summary })
    .eq('project_id', projectId)

  if (error) {
    throw new Error(`Failed to update project summary: ${error.message}`)
  }
}

/**
 * Record an architecture decision
 */
export async function recordDecision(
  projectId: string,
  decision: string,
  rationale: string
): Promise<DecisionRecord> {
  const memory = await getProjectMemory(projectId)
  const supabase = createAdminClient()

  const newDecision: DecisionRecord = {
    id: crypto.randomUUID(),
    decision,
    rationale,
    timestamp: new Date().toISOString(),
  }

  const decisions = [...memory.decisions, newDecision]

  const { error } = await supabase
    .from('project_memory')
    .update({ decisions })
    .eq('project_id', projectId)

  if (error) {
    throw new Error(`Failed to record decision: ${error.message}`)
  }

  return newDecision
}

/**
 * Record a known issue
 */
export async function recordIssue(
  projectId: string,
  issue: string,
  severity: IssueRecord['severity'] = 'medium'
): Promise<IssueRecord> {
  const memory = await getProjectMemory(projectId)
  const supabase = createAdminClient()

  const newIssue: IssueRecord = {
    id: crypto.randomUUID(),
    issue,
    severity,
    resolved: false,
    timestamp: new Date().toISOString(),
  }

  const issues = [...memory.issues, newIssue]

  const { error } = await supabase
    .from('project_memory')
    .update({ issues })
    .eq('project_id', projectId)

  if (error) {
    throw new Error(`Failed to record issue: ${error.message}`)
  }

  return newIssue
}

/**
 * Mark an issue as resolved
 */
export async function resolveIssue(
  projectId: string,
  issueId: string
): Promise<void> {
  const memory = await getProjectMemory(projectId)
  const supabase = createAdminClient()

  const issues = memory.issues.map((i) =>
    i.id === issueId ? { ...i, resolved: true } : i
  )

  const { error } = await supabase
    .from('project_memory')
    .update({ issues })
    .eq('project_id', projectId)

  if (error) {
    throw new Error(`Failed to resolve issue: ${error.message}`)
  }
}

/**
 * Add a new task
 */
export async function addTask(
  projectId: string,
  task: string
): Promise<TaskRecord> {
  const memory = await getProjectMemory(projectId)
  const supabase = createAdminClient()

  const newTask: TaskRecord = {
    id: crypto.randomUUID(),
    task,
    status: 'pending',
    timestamp: new Date().toISOString(),
  }

  const tasks = [...memory.tasks, newTask]

  const { error } = await supabase
    .from('project_memory')
    .update({ tasks })
    .eq('project_id', projectId)

  if (error) {
    throw new Error(`Failed to add task: ${error.message}`)
  }

  return newTask
}

/**
 * Update task status
 */
export async function updateTaskStatus(
  projectId: string,
  taskId: string,
  status: TaskRecord['status']
): Promise<void> {
  const memory = await getProjectMemory(projectId)
  const supabase = createAdminClient()

  const tasks = memory.tasks.map((t) =>
    t.id === taskId ? { ...t, status } : t
  )

  const { error } = await supabase
    .from('project_memory')
    .update({ tasks })
    .eq('project_id', projectId)

  if (error) {
    throw new Error(`Failed to update task: ${error.message}`)
  }
}

/**
 * Mark a task as complete
 */
export async function completeTask(
  projectId: string,
  taskId: string
): Promise<void> {
  return updateTaskStatus(projectId, taskId, 'completed')
}

/**
 * Update all tasks at once
 */
export async function updateTasks(
  projectId: string,
  tasks: TaskRecord[]
): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('project_memory')
    .update({ tasks })
    .eq('project_id', projectId)

  if (error) {
    throw new Error(`Failed to update tasks: ${error.message}`)
  }
}

/**
 * Update a user preference
 */
export async function updatePreference(
  projectId: string,
  key: string,
  value: unknown
): Promise<void> {
  const memory = await getProjectMemory(projectId)
  const supabase = createAdminClient()

  const preferences = { ...memory.preferences, [key]: value }

  const { error } = await supabase
    .from('project_memory')
    .update({ preferences })
    .eq('project_id', projectId)

  if (error) {
    throw new Error(`Failed to update preference: ${error.message}`)
  }
}

/**
 * Update a coding convention
 */
export async function updateConvention(
  projectId: string,
  key: string,
  value: string
): Promise<void> {
  const memory = await getProjectMemory(projectId)
  const supabase = createAdminClient()

  const conventions = { ...memory.conventions, [key]: value }

  const { error } = await supabase
    .from('project_memory')
    .update({ conventions })
    .eq('project_id', projectId)

  if (error) {
    throw new Error(`Failed to update convention: ${error.message}`)
  }
}

/**
 * Format memory for LLM context
 */
export function formatMemoryForLLM(memory: ProjectMemory): string {
  const sections: string[] = []

  if (memory.summary) {
    sections.push(`## Summary\n${memory.summary}`)
  }

  const recentDecisions = memory.decisions.slice(-5)
  if (recentDecisions.length > 0) {
    sections.push(
      `## Recent Decisions\n${recentDecisions
        .map((d) => `- ${d.decision} (${d.rationale})`)
        .join('\n')}`
    )
  }

  const activeTasks = memory.tasks.filter((t) => t.status !== 'completed')
  if (activeTasks.length > 0) {
    sections.push(
      `## Active Tasks\n${activeTasks.map((t) => `- [${t.status}] ${t.task}`).join('\n')}`
    )
  }

  const openIssues = memory.issues.filter((i) => !i.resolved)
  if (openIssues.length > 0) {
    sections.push(
      `## Known Issues\n${openIssues
        .map((i) => `- [${i.severity.toUpperCase()}] ${i.issue}`)
        .join('\n')}`
    )
  }

  const conventionEntries = Object.entries(memory.conventions)
  if (conventionEntries.length > 0) {
    sections.push(
      `## Conventions\n${conventionEntries.map(([k, v]) => `- ${k}: ${v}`).join('\n')}`
    )
  }

  return sections.join('\n\n')
}
