import type { Project } from '@/types/pluto'
import { isLettaConfigured } from './client'

/**
 * Check if Letta integration is enabled globally.
 * Disabled by default - set USE_LETTA=true to enable.
 * Also requires LETTA_API_KEY to be set.
 */
export function isLettaEnabled(): boolean {
  // Disabled by default - set USE_LETTA=true to enable
  const featureFlag = process.env.USE_LETTA === 'true'
  return featureFlag && isLettaConfigured()
}

/**
 * Check if Letta should be used for a specific project.
 * Returns true only if:
 * - Letta is globally enabled (USE_LETTA=true)
 * - AND Letta is configured (has API key)
 */
export function shouldUseLetta(project: Project): boolean {
  // Always respect the global feature flag first
  if (!isLettaEnabled()) {
    return false
  }

  // Letta is enabled and configured
  return true
}

/**
 * Model selection based on Letta usage.
 * When using Letta, we configure through providerOptions.
 * When not using Letta, we use Anthropic directly.
 */
export interface ModelConfig {
  useLetta: boolean
  agentId: string | null
}

export function getModelConfig(project: Project): ModelConfig {
  const useLetta = shouldUseLetta(project)
  return {
    useLetta,
    agentId: useLetta ? project.letta_agent_id : null,
  }
}
