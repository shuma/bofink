'use client'

import { useState } from 'react'
import { RefreshCw, ExternalLink, AppWindow } from 'lucide-react'
import { PreviewFrame } from './preview-frame'
import { usePreviewUrl } from '@/hooks/use-preview-url'

interface PreviewPanelProps {
  projectId: string
  sandboxId: string | null
  isBuilding: boolean
}

export function PreviewPanel({
  projectId,
  sandboxId,
  isBuilding,
}: PreviewPanelProps) {
  const { data: previewUrl, isLoading: previewLoading } = usePreviewUrl(projectId, sandboxId, isBuilding)
  const [previewKey, setPreviewKey] = useState(0)

  const handleRefresh = () => setPreviewKey((k) => k + 1)
  const handleOpenExternal = () => {
    if (previewUrl) window.open(previewUrl, '_blank')
  }

  return (
    <div className="flex h-full flex-col">
      {/* URL bar and controls */}
      {previewUrl && (
        <div className="flex items-center gap-1 px-3 pb-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1 text-[11px] text-muted-foreground">
            <AppWindow className="h-3 w-3 shrink-0" />
            <span className="truncate">{previewUrl}</span>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            aria-label="Reload preview"
            className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleOpenExternal}
            aria-label="Open in new tab"
            className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Preview iframe */}
      <div className="flex-1 px-3 pb-3">
        <PreviewFrame
          url={previewUrl ?? null}
          isLoading={isBuilding || previewLoading}
          refreshKey={previewKey}
          className="h-full"
        />
      </div>
    </div>
  )
}
