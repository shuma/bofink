import { updateAgentMemory, MEMORY_BLOCKS, getAgentMemoryState } from './agents'
import type { BuildPlan } from '@/types/pluto'

/**
 * Sync project summary to agent memory.
 * Called when project plan changes or build completes.
 */
export async function syncProjectSummary(
  agentId: string,
  summary: {
    name: string
    description?: string | null
    template: string
    plan?: BuildPlan | null
    status: string
  }
): Promise<void> {
  const planSummary = summary.plan
    ? `
Features: ${summary.plan.features.join(', ')}
Tech Stack: ${summary.plan.techStack.join(', ')}
Steps: ${summary.plan.steps.length} total`
    : 'No plan yet'

  const content = `Project: ${summary.name}
${summary.description ? `Description: ${summary.description}` : ''}
Template: ${summary.template}
Status: ${summary.status}
${planSummary}`

  await updateAgentMemory(agentId, MEMORY_BLOCKS.PROJECT, content)
}

/**
 * Record an architecture or design decision.
 */
export async function recordDecision(
  agentId: string,
  decision: string,
  rationale: string
): Promise<void> {
  // Get current decisions
  const currentState = await getAgentMemoryState(agentId)
  const currentDecisions = currentState?.[MEMORY_BLOCKS.DECISIONS] || ''

  // Append new decision with timestamp
  const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const newDecision = `[${timestamp}] ${decision}
  Rationale: ${rationale}`

  // Keep only recent decisions to avoid memory overflow
  const lines = currentDecisions.split('\n').filter((l) => l.trim())
  const recentDecisions = lines.slice(-10) // Keep last 10 decisions

  const updatedContent =
    recentDecisions.length > 0
      ? [...recentDecisions, '', newDecision].join('\n')
      : newDecision

  await updateAgentMemory(agentId, MEMORY_BLOCKS.DECISIONS, updatedContent)
}

/**
 * Record a known issue or warning.
 */
export async function recordIssue(
  agentId: string,
  issue: string,
  severity: 'low' | 'medium' | 'high' = 'medium'
): Promise<void> {
  const currentState = await getAgentMemoryState(agentId)
  const currentIssues = currentState?.[MEMORY_BLOCKS.ISSUES] || ''

  const timestamp = new Date().toISOString().split('T')[0]
  const newIssue = `[${timestamp}] [${severity.toUpperCase()}] ${issue}`

  // Keep recent issues
  const lines = currentIssues.split('\n').filter((l) => l.trim() && l !== 'No known issues.')
  const recentIssues = lines.slice(-15) // Keep last 15 issues

  const updatedContent =
    recentIssues.length > 0 ? [...recentIssues, newIssue].join('\n') : newIssue

  await updateAgentMemory(agentId, MEMORY_BLOCKS.ISSUES, updatedContent)
}

/**
 * Clear a resolved issue.
 */
export async function clearIssue(agentId: string, issueKeyword: string): Promise<void> {
  const currentState = await getAgentMemoryState(agentId)
  const currentIssues = currentState?.[MEMORY_BLOCKS.ISSUES] || ''

  // Remove lines containing the keyword
  const lines = currentIssues
    .split('\n')
    .filter((l) => l.trim() && !l.toLowerCase().includes(issueKeyword.toLowerCase()))

  const updatedContent = lines.length > 0 ? lines.join('\n') : 'No known issues.'
  await updateAgentMemory(agentId, MEMORY_BLOCKS.ISSUES, updatedContent)
}

/**
 * Update task tracking.
 */
export async function updateTasks(
  agentId: string,
  options: {
    completedTask?: string
    newTask?: string
    currentTask?: string
  }
): Promise<void> {
  const currentState = await getAgentMemoryState(agentId)
  const currentTasks = currentState?.[MEMORY_BLOCKS.TASKS] || ''

  const lines: string[] = []

  // Current task
  if (options.currentTask) {
    lines.push(`Current: ${options.currentTask}`)
  }

  // Add new task to pending
  if (options.newTask) {
    lines.push(`Pending: ${options.newTask}`)
  }

  // Keep track of completed tasks (last 5)
  const existingCompleted = currentTasks
    .split('\n')
    .filter((l) => l.startsWith('Completed:'))
    .slice(-4)

  if (options.completedTask) {
    existingCompleted.push(`Completed: ${options.completedTask}`)
  }

  if (existingCompleted.length > 0) {
    lines.push(...existingCompleted.slice(-5))
  }

  const updatedContent = lines.length > 0 ? lines.join('\n') : 'No tasks tracked yet.'
  await updateAgentMemory(agentId, MEMORY_BLOCKS.TASKS, updatedContent)
}

/**
 * Record user feedback or preference.
 */
export async function recordUserPreference(
  agentId: string,
  preference: string
): Promise<void> {
  const currentState = await getAgentMemoryState(agentId)
  const currentPrefs = currentState?.[MEMORY_BLOCKS.USER] || ''

  // Add preference
  const lines = currentPrefs
    .split('\n')
    .filter((l) => l.trim() && l !== 'No user preferences recorded yet.')
  lines.push(preference)

  // Keep last 10 preferences
  const recentPrefs = lines.slice(-10)

  await updateAgentMemory(agentId, MEMORY_BLOCKS.USER, recentPrefs.join('\n'))
}
