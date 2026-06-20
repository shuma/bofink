'use client'

import { StatusCard } from './status-card'
import { cn } from '@/lib/utils'

interface PreviewFrameProps {
  url: string | null
  isLoading?: boolean
  refreshKey?: number
  className?: string
}

export function PreviewFrame({
  url,
  isLoading = false,
  refreshKey = 0,
  className,
}: PreviewFrameProps) {
  if (!url) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-2xl border border-border bg-card',
          'min-h-[400px]',
          className
        )}
      >
        {isLoading ? (
          <StatusCard label="Starting preview…" />
        ) : (
          <p className="max-w-xs text-center text-sm text-muted-foreground">
            Preview will appear here once the build completes.
          </p>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-card',
        className
      )}
    >
      <iframe
        key={refreshKey}
        src={url}
        className="h-full w-full border-0"
        title="App Preview"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  )
}
