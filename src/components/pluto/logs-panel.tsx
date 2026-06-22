'use client'

import { BuildLog } from './build-log'
import type { BuildLogEntry } from '@/types/pluto'

interface LogsPanelProps {
  logs: BuildLogEntry[]
}

export function LogsPanel({ logs }: LogsPanelProps) {
  return (
    <div className="h-full px-3 pb-3">
      <BuildLog logs={logs} className="h-full max-h-full" />
    </div>
  )
}
