'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import type { DBMessage } from '@/types/pluto'

interface UsePersistedChatOptions {
  projectId: string
  onError?: (error: Error) => void
}

// Convert DBMessage to UIMessage format
function dbMessageToUIMessage(dbMessage: DBMessage): UIMessage {
  return {
    id: dbMessage.message_id,
    role: dbMessage.role,
    parts: dbMessage.parts as UIMessage['parts'],
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

export function usePersistedChat({ projectId, onError }: UsePersistedChatOptions) {
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const historyLoadedRef = useRef(false)
  const lastSavedCountRef = useRef(0)
  const prevStatusRef = useRef<string | null>(null)

  // Create transport for this project
  const transport = useMemo(
    () => new DefaultChatTransport({ api: `/api/projects/${projectId}/build` }),
    [projectId]
  )

  // Chat hook - initialized empty, we'll load history into it
  const chatResult = useChat({
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
        const messages = (data.messages as DBMessage[]).map(dbMessageToUIMessage)

        if (messages.length > 0) {
          chatResult.setMessages(messages)
          lastSavedCountRef.current = messages.length
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

    try {
      const messagesToSave = messages.map((msg, index) =>
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

      lastSavedCountRef.current = messages.length
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
      if (chatResult.messages.length > lastSavedCountRef.current) {
        // Use sendBeacon for reliable unload saves
        const messagesToSave = chatResult.messages.map((msg, index) =>
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

  return {
    ...chatResult,
    isLoadingHistory,
    clearHistory,
    saveMessages: () => saveMessages(chatResult.messages),
  }
}
