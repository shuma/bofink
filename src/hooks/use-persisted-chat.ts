'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import type { DBMessage } from '@/types/pluto'

interface UsePersistedChatOptions {
  projectId: string
  /**
   * Project status - determines which endpoint to use:
   * - 'building' or undefined: use /build endpoint
   * - 'ready': use /message endpoint for modifications
   */
  projectStatus?: 'planning' | 'building' | 'ready' | 'error'
  /**
   * Whether the project has an existing sandbox
   */
  hasSandbox?: boolean
  onError?: (error: Error) => void
}

/**
 * Check if a message has incomplete tool calls that would cause SDK errors.
 * This is very aggressive - we filter out any message with tool calls
 * that don't have completed results or are in incomplete states.
 */
function hasIncompleteToolCalls(parts: unknown[]): boolean {
  if (!Array.isArray(parts)) return false

  const toolCallIds = new Set<string>()
  const toolResultIds = new Set<string>()

  for (const part of parts) {
    if (typeof part !== 'object' || part === null) continue

    const p = part as Record<string, unknown>

    // Check for tool invocations by type field
    if ('type' in p && typeof p.type === 'string') {
      const type = p.type as string

      // Tool invocation or tool call types
      if (type === 'tool-invocation' || type === 'tool-call' || type.includes('tool')) {
        const state = p.state as string | undefined

        // Any state that isn't 'result' is incomplete
        // States: 'call', 'partial-call', 'input-available', 'result'
        if (state && state !== 'result') {
          console.log(`[Chat] Incomplete tool state: ${state} for type ${type}`)
          return true
        }

        // If no state field but has toolName without output, it's incomplete
        if (!state && p.toolName && !('output' in p) && !('result' in p)) {
          console.log(`[Chat] Tool call without result: ${p.toolName}`)
          return true
        }
      }
    }

    // Collect tool call IDs for cross-reference check
    if (p.toolCallId && typeof p.toolCallId === 'string') {
      // Check if this is a tool call (has toolName) or a tool result (has output or result)
      if (p.toolName && !('output' in p) && !('result' in p)) {
        toolCallIds.add(p.toolCallId)
      }
      if ('output' in p || 'result' in p) {
        toolResultIds.add(p.toolCallId)
      }
    }
  }

  // Check if any tool calls don't have results
  for (const callId of toolCallIds) {
    if (!toolResultIds.has(callId)) {
      console.log(`[Chat] Tool call ${callId} has no result`)
      return true
    }
  }

  return false
}

/**
 * Check if the last assistant message has pending tool calls.
 * If so, we shouldn't load these messages as they'll cause errors.
 */
function hasTrailingIncompleteToolCalls(messages: DBMessage[]): boolean {
  if (messages.length === 0) return false

  const lastMessage = messages[messages.length - 1]
  if (lastMessage.role !== 'assistant') return false

  return hasIncompleteToolCalls(lastMessage.parts)
}

/**
 * Clean up message parts by removing incomplete tool calls.
 * Returns cleaned parts array, or null if nothing remains.
 */
function cleanMessageParts(parts: unknown[]): unknown[] | null {
  if (!Array.isArray(parts)) return null

  const toolCallIds = new Set<string>()
  const toolResultIds = new Set<string>()

  // First pass: collect all tool call and result IDs
  for (const part of parts) {
    if (typeof part !== 'object' || part === null) continue
    const p = part as Record<string, unknown>

    if (p.toolCallId && typeof p.toolCallId === 'string') {
      if (p.toolName && !('output' in p) && !('result' in p)) {
        toolCallIds.add(p.toolCallId)
      }
      if ('output' in p || 'result' in p) {
        toolResultIds.add(p.toolCallId)
      }
    }
  }

  // Find incomplete tool call IDs
  const incompleteIds = new Set<string>()
  for (const callId of toolCallIds) {
    if (!toolResultIds.has(callId)) {
      incompleteIds.add(callId)
    }
  }

  // Second pass: filter out incomplete tool parts
  const cleanedParts = parts.filter((part) => {
    if (typeof part !== 'object' || part === null) return true

    const p = part as Record<string, unknown>

    // Check if this part is related to an incomplete tool call
    if (p.toolCallId && typeof p.toolCallId === 'string') {
      if (incompleteIds.has(p.toolCallId)) {
        console.log(`[Chat] Removing incomplete tool part: ${p.toolCallId}`)
        return false
      }
    }

    // Check for tool invocation in incomplete state
    if ('type' in p && typeof p.type === 'string') {
      const type = p.type as string
      if (type === 'tool-invocation' || type === 'tool-call' || type.includes('tool')) {
        const state = p.state as string | undefined
        if (state && state !== 'result') {
          console.log(`[Chat] Removing tool part with incomplete state: ${state}`)
          return false
        }
      }
    }

    return true
  })

  // If only empty parts remain, return null
  if (cleanedParts.length === 0) return null

  // Check if we have any meaningful content left
  const hasContent = cleanedParts.some((part) => {
    if (typeof part === 'string' && part.trim()) return true
    if (typeof part === 'object' && part !== null) {
      const p = part as Record<string, unknown>
      if ('text' in p && typeof p.text === 'string' && p.text.trim()) return true
      if ('type' in p && p.type === 'text') return true
    }
    return false
  })

  return hasContent ? cleanedParts : null
}

// Convert DBMessage to UIMessage format
function dbMessageToUIMessage(dbMessage: DBMessage): UIMessage | null {
  // Clean up parts to remove incomplete tool calls
  const cleanedParts = cleanMessageParts(dbMessage.parts)

  if (!cleanedParts) {
    console.log(`[Chat] Message ${dbMessage.message_id} has no valid content after cleaning`)
    return null
  }

  return {
    id: dbMessage.message_id,
    role: dbMessage.role,
    parts: cleanedParts as UIMessage['parts'],
  }
}

// Convert UIMessage to the format needed for saving
function uiMessageToDBFormat(
  message: UIMessage,
  sequenceNum: number
): {
  message_id: string
  role: 'system' | 'user' | 'assistant'
  parts: unknown[]
  sequence_num: number
} {
  return {
    message_id: message.id,
    role: message.role as 'system' | 'user' | 'assistant',
    parts: message.parts as unknown[],
    sequence_num: sequenceNum,
  }
}

export function usePersistedChat({
  projectId,
  projectStatus,
  hasSandbox,
  onError,
}: UsePersistedChatOptions) {
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const historyLoadedRef = useRef(false)
  const lastSavedCountRef = useRef(0)
  const prevStatusRef = useRef<string | null>(null)

  // Determine which endpoint to use based on project state
  // Use /message for ready projects with existing sandboxes
  // Use /build for initial builds or projects without sandboxes
  const isReady = projectStatus === 'ready' && hasSandbox
  const endpointPath = isReady ? 'message' : 'build'
  const endpoint = `/api/projects/${projectId}/${endpointPath}`

  // Log endpoint selection for debugging
  useEffect(() => {
    console.log(`[Chat] Endpoint selected: ${endpoint} (status: ${projectStatus}, hasSandbox: ${hasSandbox})`)
  }, [endpoint, projectStatus, hasSandbox])

  // Create transport - must be memoized to avoid recreating on every render
  // but must also update when endpoint changes
  const transport = useMemo(
    () => new DefaultChatTransport({ api: endpoint }),
    [endpoint]
  )

  // Chat hook with unique ID based on endpoint to force state separation
  const chatResult = useChat({
    id: `chat-${projectId}-${endpointPath}`,
    transport,
    onError: (err) => {
      console.error('Chat error:', err)
      onError?.(err)
    },
  })

  // Load message history on mount and set it via setMessages
  useEffect(() => {
    if (historyLoadedRef.current) return

    const loadHistory = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/messages`)
        if (!response.ok) {
          // Table might not exist yet - that's ok for new installs
          console.warn('Failed to load message history:', response.status)
          historyLoadedRef.current = true
          setIsLoadingHistory(false)
          return
        }

        const data = await response.json()
        let dbMessages = data.messages as DBMessage[]

        console.log(`[Chat] Loaded ${dbMessages.length} messages from history`)

        // If the last message has incomplete tool calls, we can't safely resume
        // Instead, start fresh or truncate to the last complete exchange
        if (hasTrailingIncompleteToolCalls(dbMessages)) {
          console.warn('[Chat] Found incomplete tool calls in history, truncating...')
          // Find the last complete message (user message or assistant without pending tools)
          let lastSafeIndex = dbMessages.length - 1
          while (lastSafeIndex >= 0) {
            const msg = dbMessages[lastSafeIndex]
            if (msg.role === 'user' || !hasIncompleteToolCalls(msg.parts)) {
              break
            }
            lastSafeIndex--
          }
          dbMessages = dbMessages.slice(0, lastSafeIndex + 1)
          console.log(`[Chat] Truncated to ${dbMessages.length} messages`)
        }

        // Filter out any remaining messages with incomplete tool calls
        const validMessages = dbMessages.filter((msg) => {
          const isIncomplete = hasIncompleteToolCalls(msg.parts)
          if (isIncomplete) {
            console.log(`[Chat] Filtering out message ${msg.message_id} (role: ${msg.role}) with incomplete tool calls`)
          }
          return !isIncomplete
        })

        console.log(`[Chat] ${validMessages.length} valid messages after filtering (removed ${dbMessages.length - validMessages.length})`)

        // Convert and filter out null results (messages with no valid content)
        const messages = validMessages
          .map(dbMessageToUIMessage)
          .filter((msg): msg is UIMessage => msg !== null)

        console.log(`[Chat] ${messages.length} messages after conversion (removed ${validMessages.length - messages.length} during conversion)`)

        if (messages.length > 0) {
          try {
            chatResult.setMessages(messages)
            lastSavedCountRef.current = messages.length
            console.log(`[Chat] Successfully loaded ${messages.length} messages into chat`)
          } catch (setError) {
            // If setting messages fails (e.g., SDK validation), fall back to empty state
            console.error('[Chat] Failed to set messages, starting fresh:', setError)
            // Clear the corrupted messages from the database
            try {
              await fetch(`/api/projects/${projectId}/messages`, { method: 'DELETE' })
              console.log('[Chat] Cleared corrupted messages from database')
            } catch (deleteError) {
              console.error('[Chat] Failed to clear corrupted messages:', deleteError)
            }
          }
        }
        historyLoadedRef.current = true
      } catch (error) {
        console.error('Error loading message history:', error)
        historyLoadedRef.current = true
      } finally {
        setIsLoadingHistory(false)
      }
    }

    loadHistory()
  }, [projectId, chatResult.setMessages])

  // Function to save messages to the database
  const saveMessages = useCallback(async (messages: UIMessage[]) => {
    if (messages.length === 0) return

    // Only save new messages since last save
    const newMessages = messages.slice(lastSavedCountRef.current)
    if (newMessages.length === 0) return

    // Filter out messages with incomplete tool calls
    const completeMessages = messages.filter(
      (msg) => !hasIncompleteToolCalls(msg.parts as unknown[])
    )
    if (completeMessages.length === 0) return

    try {
      const messagesToSave = completeMessages.map((msg, index) =>
        uiMessageToDBFormat(msg, index)
      )

      const response = await fetch(`/api/projects/${projectId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesToSave }),
      })

      if (!response.ok) {
        throw new Error('Failed to save messages')
      }

      lastSavedCountRef.current = completeMessages.length
    } catch (error) {
      console.error('Error saving messages:', error)
    }
  }, [projectId])

  // Save messages when streaming completes (status transitions from streaming to ready)
  useEffect(() => {
    const wasStreaming = prevStatusRef.current === 'streaming' || prevStatusRef.current === 'submitted'
    const isNowReady = chatResult.status === 'ready' || chatResult.status === 'error'

    if (wasStreaming && isNowReady) {
      // Stream completed, save messages
      saveMessages(chatResult.messages)
    }

    prevStatusRef.current = chatResult.status
  }, [chatResult.status, chatResult.messages, saveMessages])

  // Save on page unload as a safety net
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Filter out messages with incomplete tool calls
      const completeMessages = chatResult.messages.filter(
        (msg) => !hasIncompleteToolCalls(msg.parts as unknown[])
      )

      if (completeMessages.length > lastSavedCountRef.current) {
        // Use sendBeacon for reliable unload saves
        const messagesToSave = completeMessages.map((msg, index) =>
          uiMessageToDBFormat(msg, index)
        )

        navigator.sendBeacon(
          `/api/projects/${projectId}/messages`,
          JSON.stringify({ messages: messagesToSave })
        )
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [projectId, chatResult.messages])

  // Clear history function
  const clearHistory = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/messages`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to clear history')
      }

      lastSavedCountRef.current = 0
      chatResult.setMessages([])
    } catch (error) {
      console.error('Error clearing history:', error)
      throw error
    }
  }, [projectId, chatResult])

  // Wrap sendMessage to log endpoint info
  const wrappedSendMessage: typeof chatResult.sendMessage = useCallback(
    (options) => {
      console.log(`[Chat] sendMessage called - using endpoint: ${endpoint} (status: ${projectStatus}, hasSandbox: ${hasSandbox})`)
      return chatResult.sendMessage(options)
    },
    [chatResult.sendMessage, endpoint, projectStatus, hasSandbox]
  )

  return {
    ...chatResult,
    sendMessage: wrappedSendMessage,
    isLoadingHistory,
    clearHistory,
    saveMessages: () => saveMessages(chatResult.messages),
    // Expose which endpoint is being used (for debugging)
    currentEndpoint: endpoint,
  }
}
