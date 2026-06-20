'use client'

import { useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Project, Generation } from '@/types/pluto'

interface UseRealtimeOptions<T> {
  table: 'projects' | 'generations'
  filter?: {
    column: string
    value: string
  }
  onUpdate?: (payload: T) => void
  onInsert?: (payload: T) => void
  onDelete?: (payload: { old: T }) => void
}

export function useRealtime<T extends Project | Generation>({
  table,
  filter,
  onUpdate,
  onInsert,
  onDelete,
}: UseRealtimeOptions<T>) {
  const channelRef = useRef<RealtimeChannel | null>(null)

  const subscribe = useCallback(() => {
    const supabase = createClient()

    // Build channel name
    const channelName = filter
      ? `${table}:${filter.column}=eq.${filter.value}`
      : table

    // Unsubscribe from existing channel if any
    if (channelRef.current) {
      channelRef.current.unsubscribe()
    }

    // Create new channel
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: filter ? `${filter.column}=eq.${filter.value}` : undefined,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && onUpdate) {
            onUpdate(payload.new as T)
          } else if (payload.eventType === 'INSERT' && onInsert) {
            onInsert(payload.new as T)
          } else if (payload.eventType === 'DELETE' && onDelete) {
            onDelete({ old: payload.old as T })
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
    }
  }, [table, filter, onUpdate, onInsert, onDelete])

  useEffect(() => {
    const unsubscribe = subscribe()
    return unsubscribe
  }, [subscribe])

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }
  }, [])

  return { unsubscribe }
}

// Convenience hook for project updates
export function useProjectRealtime(
  projectId: string,
  onUpdate: (project: Project) => void
) {
  return useRealtime<Project>({
    table: 'projects',
    filter: { column: 'id', value: projectId },
    onUpdate,
  })
}

// Convenience hook for generation updates
export function useGenerationRealtime(
  projectId: string,
  callbacks: {
    onUpdate?: (generation: Generation) => void
    onInsert?: (generation: Generation) => void
  }
) {
  return useRealtime<Generation>({
    table: 'generations',
    filter: { column: 'project_id', value: projectId },
    onUpdate: callbacks.onUpdate,
    onInsert: callbacks.onInsert,
  })
}
