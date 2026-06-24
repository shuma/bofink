import type { BuildPlan } from '@/types/pluto'
import { getLettaClient } from './client'

/**
 * Memory block labels used by Pluto agents.
 */
export const MEMORY_BLOCKS = {
  PROJECT: 'project',
  USER: 'user',
  DECISIONS: 'decisions',
  TASKS: 'tasks',
  ISSUES: 'issues',
} as const

export type MemoryBlockLabel = (typeof MEMORY_BLOCKS)[keyof typeof MEMORY_BLOCKS]

/**
 * Options for creating a new project agent.
 */
export interface CreateAgentOptions {
  projectId: string
  projectName: string
  projectDescription?: string
  plan?: BuildPlan | null
  template: string
}

/**
 * Build the system prompt for a Pluto agent.
 */
function buildSystemPrompt(options: CreateAgentOptions): string {
  return `You are a coding assistant for the Pluto AI Web App Builder.

Project: ${options.projectName}
${options.projectDescription ? `Description: ${options.projectDescription}` : ''}
Template: ${options.template}

## Memory Guidelines

Your persistent memory stores your understanding of the project, not the actual source code.
- Daytona sandbox is the source of truth for all files and code
- Use tools to read/edit files - don't store file contents in memory
- Store: decisions made, user preferences, project goals, known issues
- Don't store: raw source code, node_modules, build artifacts

## Your Role

1. Help users build and modify their web applications
2. Remember context across sessions (architecture decisions, user preferences)
3. Use tools to interact with the Daytona sandbox (read/write files, run commands)
4. Minimize context usage by reading only necessary files
5. Summarize important decisions in your memory blocks

## Available Memory Blocks

- project: Current project state, goals, and summary
- user: User preferences and feedback
- decisions: Architecture choices and their rationale
- tasks: Current and completed tasks
- issues: Known bugs, warnings, and problems to address`
}

/**
 * Build initial memory block content.
 */
function buildInitialMemoryBlocks(options: CreateAgentOptions): Record<MemoryBlockLabel, string> {
  const planSummary = options.plan
    ? `Features: ${options.plan.features.join(', ')}\nTech Stack: ${options.plan.techStack.join(', ')}`
    : 'No plan yet'

  return {
    [MEMORY_BLOCKS.PROJECT]: `Project: ${options.projectName}
${options.projectDescription ? `Description: ${options.projectDescription}` : ''}
Template: ${options.template}
${planSummary}`,
    [MEMORY_BLOCKS.USER]: 'No user preferences recorded yet.',
    [MEMORY_BLOCKS.DECISIONS]: 'No architecture decisions recorded yet.',
    [MEMORY_BLOCKS.TASKS]: 'No tasks tracked yet.',
    [MEMORY_BLOCKS.ISSUES]: 'No known issues.',
  }
}

/**
 * Create a new Letta agent for a project.
 */
export async function createProjectAgent(
  options: CreateAgentOptions
): Promise<{ agentId: string }> {
  const client = getLettaClient()
  if (!client) {
    throw new Error('Letta client not configured')
  }

  const systemPrompt = buildSystemPrompt(options)
  const initialMemory = buildInitialMemoryBlocks(options)

  // Create the agent with memory blocks
  const agent = await client.agents.create({
    name: `pluto-${options.projectId}`,
    description: `Pluto agent for project: ${options.projectName}`,
    system: systemPrompt,
    memory_blocks: [
      { label: MEMORY_BLOCKS.PROJECT, value: initialMemory[MEMORY_BLOCKS.PROJECT] },
      { label: MEMORY_BLOCKS.USER, value: initialMemory[MEMORY_BLOCKS.USER] },
      { label: MEMORY_BLOCKS.DECISIONS, value: initialMemory[MEMORY_BLOCKS.DECISIONS] },
      { label: MEMORY_BLOCKS.TASKS, value: initialMemory[MEMORY_BLOCKS.TASKS] },
      { label: MEMORY_BLOCKS.ISSUES, value: initialMemory[MEMORY_BLOCKS.ISSUES] },
    ],
    // Use Claude model through Letta (BYOK - uses your Anthropic API key)
    model: 'anthropic/claude-sonnet-4-6',
    // Use Letta's free embeddings instead of OpenAI (avoids extra billing)
    embedding: 'letta/letta-free',
  })

  console.log(`[Letta] Created agent ${agent.id} for project ${options.projectId}`)

  return { agentId: agent.id }
}

/**
 * Get an existing agent or create a new one for the project.
 */
export async function getOrCreateAgent(
  projectId: string,
  existingAgentId: string | null,
  options: Omit<CreateAgentOptions, 'projectId'>
): Promise<{ agentId: string; isNew: boolean }> {
  const client = getLettaClient()
  if (!client) {
    throw new Error('Letta client not configured')
  }

  // If we have an existing agent ID, verify it exists
  if (existingAgentId) {
    try {
      const agent = await client.agents.retrieve(existingAgentId)
      if (agent) {
        console.log(`[Letta] Using existing agent ${existingAgentId}`)
        return { agentId: existingAgentId, isNew: false }
      }
    } catch {
      // Agent doesn't exist (deleted externally?), create a new one
      console.warn(`[Letta] Agent ${existingAgentId} not found, creating new one`)
    }
  }

  // Create a new agent
  const { agentId } = await createProjectAgent({ ...options, projectId })
  return { agentId, isNew: true }
}

/**
 * Update a specific memory block for an agent.
 */
export async function updateAgentMemory(
  agentId: string,
  blockLabel: MemoryBlockLabel,
  content: string
): Promise<void> {
  const client = getLettaClient()
  if (!client) {
    throw new Error('Letta client not configured')
  }

  // Update the block directly by label
  // The Letta API allows updating blocks by label with agent_id
  try {
    await client.agents.blocks.update(blockLabel, {
      agent_id: agentId,
      value: content,
    })
    console.log(`[Letta] Updated memory block "${blockLabel}" for agent ${agentId}`)
  } catch (error) {
    console.warn(`[Letta] Failed to update memory block "${blockLabel}" for agent ${agentId}:`, error)
  }
}

/**
 * Delete an agent when a project is deleted.
 */
export async function deleteAgent(agentId: string): Promise<void> {
  const client = getLettaClient()
  if (!client) {
    return
  }

  try {
    await client.agents.delete(agentId)
    console.log(`[Letta] Deleted agent ${agentId}`)
  } catch (error) {
    // Agent may already be deleted
    console.warn(`[Letta] Failed to delete agent ${agentId}:`, error)
  }
}

/**
 * Get the current state of all memory blocks for debugging.
 */
export async function getAgentMemoryState(
  agentId: string
): Promise<Record<string, string> | null> {
  const client = getLettaClient()
  if (!client) {
    return null
  }

  try {
    const blocksPage = await client.agents.blocks.list(agentId)
    const state: Record<string, string> = {}

    // Iterate over paginated results
    for await (const block of blocksPage) {
      if (block.label && block.value) {
        state[block.label] = block.value
      }
    }

    return state
  } catch (error) {
    console.error(`[Letta] Failed to get memory state for agent ${agentId}:`, error)
    return null
  }
}
