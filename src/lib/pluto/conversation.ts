/**
 * Conversation Summarization
 *
 * Compresses long chat histories to reduce token usage while preserving
 * important context. Uses a sliding window approach:
 * - Recent messages: kept in full
 * - Older messages: summarized into a compact form
 */

import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import type { UIMessage } from 'ai'

// Configuration
const CONFIG = {
  // Messages to keep in full (most recent)
  recentMessageCount: 6,
  // Approximate token threshold before summarizing
  tokenThreshold: 8000,
  // Chars per token estimate
  charsPerToken: 4,
  // Max summary length in chars
  maxSummaryLength: 2000,
}

// Estimate tokens from string content
function estimateTokens(text: string): number {
  return Math.ceil(text.length / CONFIG.charsPerToken)
}

// Estimate tokens for a message
function estimateMessageTokens(message: UIMessage): number {
  let tokens = 0

  for (const part of message.parts) {
    if (typeof part === 'string') {
      tokens += estimateTokens(part)
    } else if ('text' in part && typeof part.text === 'string') {
      tokens += estimateTokens(part.text)
    } else if ('content' in part && typeof part.content === 'string') {
      tokens += estimateTokens(part.content)
    } else {
      // Tool calls, etc. - estimate based on JSON size
      tokens += estimateTokens(JSON.stringify(part))
    }
  }

  return tokens
}

// Extract text content from a message for summarization
function extractMessageText(message: UIMessage): string {
  const texts: string[] = []

  for (const part of message.parts) {
    if (typeof part === 'string') {
      texts.push(part)
    } else if ('text' in part && typeof part.text === 'string') {
      texts.push(part.text)
    } else if ('content' in part && typeof part.content === 'string') {
      texts.push(part.content)
    } else if ('toolName' in part) {
      // Summarize tool calls briefly
      const toolPart = part as { toolName: string; input?: unknown; output?: unknown }
      if (toolPart.output) {
        texts.push(`[Tool: ${toolPart.toolName}]`)
      }
    }
  }

  return texts.join('\n')
}

// Create a summary message
function createSummaryMessage(summary: string): UIMessage {
  return {
    id: `summary-${Date.now()}`,
    role: 'system',
    parts: [{ type: 'text', text: summary }],
  }
}

/**
 * Summarize older messages in a conversation
 */
async function summarizeMessages(messages: UIMessage[]): Promise<string> {
  // Extract text from messages
  const conversationText = messages
    .map((msg) => {
      const role = msg.role.toUpperCase()
      const text = extractMessageText(msg)
      return `${role}: ${text}`
    })
    .join('\n\n')

  // Use haiku for fast, cheap summarization
  const result = await generateText({
    model: anthropic('claude-3-5-haiku-20241022'),
    system: `You are a conversation summarizer. Create a concise summary of the conversation that captures:
- Key decisions made
- Files created or modified
- Important context about the project state
- Any errors encountered and how they were resolved

Keep the summary under 500 words. Focus on information that would be useful for continuing the conversation.`,
    prompt: `Summarize this conversation:\n\n${conversationText}`,
  })

  return result.text
}

/**
 * Check if conversation needs summarization
 */
export function needsSummarization(messages: UIMessage[]): boolean {
  if (messages.length <= CONFIG.recentMessageCount) {
    return false
  }

  const totalTokens = messages.reduce(
    (sum, msg) => sum + estimateMessageTokens(msg),
    0
  )

  return totalTokens > CONFIG.tokenThreshold
}

/**
 * Get estimated token count for messages
 */
export function getMessageTokenCount(messages: UIMessage[]): number {
  return messages.reduce((sum, msg) => sum + estimateMessageTokens(msg), 0)
}

/**
 * Compress conversation by summarizing older messages
 *
 * Returns a new message array with:
 * - A summary message at the start (if summarization occurred)
 * - The most recent messages in full
 */
export async function compressConversation(
  messages: UIMessage[]
): Promise<{ messages: UIMessage[]; wasSummarized: boolean; tokensSaved: number }> {
  if (!needsSummarization(messages)) {
    return { messages, wasSummarized: false, tokensSaved: 0 }
  }

  const originalTokens = getMessageTokenCount(messages)

  // Split into old (to summarize) and recent (to keep)
  const splitIndex = messages.length - CONFIG.recentMessageCount
  const oldMessages = messages.slice(0, splitIndex)
  const recentMessages = messages.slice(splitIndex)

  // Generate summary of old messages
  const summary = await summarizeMessages(oldMessages)

  // Create new message array
  const summaryMessage = createSummaryMessage(
    `[CONVERSATION SUMMARY]\n${summary}\n[END SUMMARY]\n\nThe conversation continues below:`
  )

  const compressedMessages = [summaryMessage, ...recentMessages]
  const newTokens = getMessageTokenCount(compressedMessages)

  return {
    messages: compressedMessages,
    wasSummarized: true,
    tokensSaved: originalTokens - newTokens,
  }
}

/**
 * Conversation state for incremental summarization
 */
export interface ConversationState {
  summaries: string[]
  lastSummarizedIndex: number
  totalMessageCount: number
}

/**
 * Create initial conversation state
 */
export function createConversationState(): ConversationState {
  return {
    summaries: [],
    lastSummarizedIndex: 0,
    totalMessageCount: 0,
  }
}

/**
 * Incrementally update conversation state
 *
 * This approach keeps a running summary instead of re-summarizing everything.
 */
export async function updateConversationState(
  state: ConversationState,
  messages: UIMessage[]
): Promise<{
  state: ConversationState
  contextMessages: UIMessage[]
  tokensSaved: number
}> {
  const newMessageCount = messages.length

  // If we have significantly more messages than last time, summarize the new ones
  const unsummarizedMessages = messages.slice(state.lastSummarizedIndex)
  const recentMessages = messages.slice(-CONFIG.recentMessageCount)

  // Check if we need to summarize
  const unsummarizedTokens = getMessageTokenCount(unsummarizedMessages)

  if (unsummarizedTokens < CONFIG.tokenThreshold / 2) {
    // No need to summarize yet
    return {
      state: { ...state, totalMessageCount: newMessageCount },
      contextMessages: messages,
      tokensSaved: 0,
    }
  }

  // Summarize messages between last summary and recent messages
  const toSummarize = unsummarizedMessages.slice(
    0,
    unsummarizedMessages.length - CONFIG.recentMessageCount
  )

  if (toSummarize.length === 0) {
    return {
      state: { ...state, totalMessageCount: newMessageCount },
      contextMessages: messages,
      tokensSaved: 0,
    }
  }

  const newSummary = await summarizeMessages(toSummarize)

  // Combine with previous summaries
  const combinedSummaries = [...state.summaries, newSummary]

  // If we have too many summaries, summarize them together
  let finalSummaries = combinedSummaries
  if (combinedSummaries.join('\n').length > CONFIG.maxSummaryLength * 2) {
    const metaSummary = await summarizeMessages([
      createSummaryMessage(combinedSummaries.join('\n\n---\n\n')),
    ])
    finalSummaries = [metaSummary]
  }

  // Create context messages
  const summaryMessage = createSummaryMessage(
    `[CONVERSATION HISTORY SUMMARY]\n${finalSummaries.join('\n\n---\n\n')}\n[END SUMMARY]`
  )

  const originalTokens = getMessageTokenCount(messages)
  const contextMessages = [summaryMessage, ...recentMessages]
  const newTokens = getMessageTokenCount(contextMessages)

  return {
    state: {
      summaries: finalSummaries,
      lastSummarizedIndex: messages.length - CONFIG.recentMessageCount,
      totalMessageCount: newMessageCount,
    },
    contextMessages,
    tokensSaved: originalTokens - newTokens,
  }
}

/**
 * Format messages for efficient context
 *
 * Returns messages as-is for now - the AI SDK handles its own formats.
 * In the future, we could add message filtering or summarization here.
 */
export function formatMessagesForContext(messages: UIMessage[]): UIMessage[] {
  // Return messages unchanged to preserve type compatibility
  // Tool output truncation is handled at the tool execution level
  return messages
}
