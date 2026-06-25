'use client'

import { BuildLog } from './build-log'
import { cn } from '@/lib/utils'
import type { BuildLogEntry } from '@/types/pluto'

interface LogsPanelProps {
  logs: BuildLogEntry[]
  className?: string
  noPadding?: boolean
}

export function LogsPanel({ logs, className, noPadding = false }: LogsPanelProps) {
  return (
    <div className={cn('h-full', !noPadding && 'px-3 pb-3', className)}>
      <BuildLog logs={logs} className="h-full max-h-full" noPadding={noPadding} />
    </div>
  )
}
