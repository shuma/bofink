// Letta SDK integration for Pluto AI Web App Builder
// Provides persistent agent memory across sessions

export { getLettaClient, isLettaConfigured, resetLettaClient } from './client'

export { isLettaEnabled, shouldUseLetta, getModelConfig } from './feature-flag'
export type { ModelConfig } from './feature-flag'

export {
  MEMORY_BLOCKS,
  createProjectAgent,
  getOrCreateAgent,
  updateAgentMemory,
  deleteAgent,
  getAgentMemoryState,
} from './agents'
export type { MemoryBlockLabel, CreateAgentOptions } from './agents'

export {
  syncProjectSummary,
  recordDecision,
  recordIssue,
  clearIssue,
  updateTasks,
  recordUserPreference,
} from './memory'

export {
  streamWithLetta,
  convertToClientTools,
} from './streaming'
export type { LettaStreamOptions } from './streaming'
