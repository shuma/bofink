import { anthropic } from '@ai-sdk/anthropic'

export type TaskType = 'clarification' | 'planning' | 'code_generation' | 'modification'

/**
 * Get the appropriate model for a given task type.
 *
 * Note: Morph Fast models don't support tool calling, so we use Anthropic
 * for all agentic tasks. Morph is still used for:
 * - Fast Apply (10,500 tok/s code editing via MorphClient SDK)
 * - WarpGrep (semantic code search via MorphClient SDK)
 * These are accessed through tools.ts, not through this model selection.
 */
export function getModelForTask(taskType: TaskType) {
  // All tasks use Anthropic since Morph doesn't support tool calling
  return anthropic('claude-sonnet-4-6')
}

/**
 * Get the model ID string for logging/debugging purposes
 */
export function getModelId(taskType: TaskType): string {
  return 'claude-sonnet-4-6'
}
