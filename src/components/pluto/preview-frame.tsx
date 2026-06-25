'use client'

import { StatusCard } from './status-card'
import { cn } from '@/lib/utils'

interface PreviewFrameProps {
  url: string | null
  isLoading?: boolean
  refreshKey?: number
  className?: string
  noPadding?: boolean
}

export function PreviewFrame({
  url,
  isLoading = false,
  refreshKey = 0,
  className,
  noPadding = false,
}: PreviewFrameProps) {
  if (!url) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-card',
          !noPadding && 'rounded-2xl border border-border',
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
        'overflow-hidden bg-card',
        !noPadding && 'rounded-2xl border border-border',
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
