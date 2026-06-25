'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { BuildLogEntry } from '@/types/pluto'

interface BuildLogProps {
  logs: BuildLogEntry[]
  className?: string
  noPadding?: boolean
}

// Terminal-style prefix symbols
function LogPrefix({ type }: { type: BuildLogEntry['type'] }) {
  switch (type) {
    case 'success':
      return <span className="text-emerald-600 select-none">✓</span>
    case 'error':
      return <span className="text-red-500 select-none">✗</span>
    case 'command':
      return <span className="text-sky-600 select-none">&gt;_</span>
    case 'output':
      return <span className="text-muted-foreground/60 select-none">&lt;&gt;</span>
    case 'info':
    default:
      return <span className="text-muted-foreground/60 select-none">◦</span>
  }
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function BuildLog({ logs, className, noPadding = false }: BuildLogProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [seenCount, setSeenCount] = useState(0)

  // Track which logs are "new" for animation
  useEffect(() => {
    // Mark current logs as seen after animation duration
    const timer = setTimeout(() => {
      setSeenCount(logs.length)
    }, 300)
    return () => clearTimeout(timer)
  }, [logs.length])

  // Smooth auto-scroll to bottom on new logs
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [logs])

  if (logs.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center',
          !noPadding && 'rounded-2xl border border-dashed border-border',
          'bg-muted/20',
          className
        )}
      >
        <p className="text-sm text-muted-foreground/70">
          Build logs will appear here
        </p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'bg-card overflow-auto',
        !noPadding && 'rounded-2xl border border-border',
        className
      )}
    >
      <div className="p-3">
        <table className="w-full font-mono text-[13px] leading-relaxed border-separate border-spacing-0">
          <tbody>
            {logs.map((log, index) => {
              const isNew = index >= seenCount
              return (
              <tr
                key={`${log.id}-${index}`}
                className={cn(
                  'group',
                  log.type === 'command' && 'bg-sky-500/[0.06]',
                  log.type === 'success' && 'bg-emerald-500/[0.06]',
                  log.type === 'error' && 'bg-red-500/[0.06]',
                  isNew && 'animate-in fade-in-0 slide-in-from-bottom-1 duration-200 ease-out'
                )}
              >
                {/* Prefix */}
                <td className="w-6 py-1.5 pl-2 pr-1 align-top text-center">
                  <LogPrefix type={log.type} />
                </td>

                {/* Content */}
                <td className="py-1.5 pr-3 align-top">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    {log.step && (
                      <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wide">
                        [{log.step}]
                      </span>
                    )}
                    <span
                      className={cn(
                        'break-words',
                        log.type === 'error' && 'text-red-600',
                        log.type === 'success' && 'text-emerald-700',
                        log.type === 'command' && 'text-sky-700',
                        log.type === 'output' && 'text-muted-foreground/80',
                        log.type === 'info' && 'text-foreground/90'
                      )}
                    >
                      {log.message}
                    </span>
                  </div>
                </td>

                {/* Timestamp */}
                <td className="w-20 py-1.5 pr-2 align-top text-right">
                  <span className="text-[11px] tabular-nums text-muted-foreground/50" suppressHydrationWarning>
                    {formatTime(log.timestamp)}
                  </span>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    </div>
  )
}
