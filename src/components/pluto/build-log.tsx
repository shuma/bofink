'use client'

import { useEffect, useRef } from 'react'
import { Check, AlertCircle, Terminal, Info, Code } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BuildLogEntry } from '@/types/pluto'

interface BuildLogProps {
  logs: BuildLogEntry[]
  className?: string
}

function LogIcon({ type }: { type: BuildLogEntry['type'] }) {
  switch (type) {
    case 'success':
      return <Check className="h-4 w-4 text-green-500" />
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />
    case 'command':
      return <Terminal className="h-4 w-4 text-blue-500" />
    case 'output':
      return <Code className="h-4 w-4 text-muted-foreground" />
    case 'info':
    default:
      return <Info className="h-4 w-4 text-muted-foreground" />
  }
}

export function BuildLog({ logs, className }: BuildLogProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs])

  if (logs.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center p-8',
          'bg-muted/30 rounded-lg border border-dashed border-border',
          className
        )}
      >
        <p className="text-sm text-muted-foreground">
          Build logs will appear here...
        </p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'rounded-lg border border-border bg-card overflow-auto',
        'font-mono text-sm',
        className
      )}
    >
      <div className="p-4 space-y-2">
        {logs.map((log, index) => (
          <div
            key={`${log.id}-${index}`}
            className={cn(
              'flex items-start gap-3 p-2 rounded',
              log.type === 'error' && 'bg-red-500/10',
              log.type === 'success' && 'bg-green-500/10',
              log.type === 'command' && 'bg-blue-500/10'
            )}
          >
            <LogIcon type={log.type} />
            <div className="flex-1 min-w-0">
              {log.step && (
                <span className="text-xs text-muted-foreground mr-2">
                  [{log.step}]
                </span>
              )}
              <span
                className={cn(
                  'break-words',
                  log.type === 'error' && 'text-red-500',
                  log.type === 'success' && 'text-green-500',
                  log.type === 'command' && 'text-blue-500',
                  log.type === 'output' && 'text-muted-foreground'
                )}
              >
                {log.message}
              </span>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
