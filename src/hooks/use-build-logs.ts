'use client'

import { useQuery } from '@tanstack/react-query'
import type { BuildLogEntry } from '@/types/pluto'

interface DBBuildLog {
  id: string
  project_id: string
  message_id: string | null
  type: 'info' | 'command' | 'output' | 'error' | 'success'
  message: string
  step: string | null
  created_at: string
}

async function fetchBuildLogs(projectId: string): Promise<BuildLogEntry[]> {
  const response = await fetch(`/api/projects/${projectId}/logs`)

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized')
    }
    throw new Error('Failed to fetch build logs')
  }

  const data = await response.json()

  // Convert DBBuildLog to BuildLogEntry
  return (data.logs as DBBuildLog[]).map((log) => ({
    id: log.id,
    timestamp: log.created_at,
    type: log.type,
    message: log.message,
    step: log.step || undefined,
  }))
}

interface UseBuildLogsOptions {
  /** Whether the logs panel is currently visible */
  isVisible?: boolean
  /** Whether a build is currently in progress */
  isBuilding?: boolean
}

export function useBuildLogs(
  projectId: string,
  options: UseBuildLogsOptions = {}
) {
  const { isVisible = false, isBuilding = false } = options

  // Only fetch logs when the panel is visible
  const enabled = isVisible

  // Refetch more frequently during builds, less when just viewing
  const refetchInterval = isBuilding ? 3000 : false

  return useQuery({
    queryKey: ['build-logs', projectId],
    queryFn: () => fetchBuildLogs(projectId),
    enabled,
    refetchInterval,
    staleTime: 5000,
  })
}
