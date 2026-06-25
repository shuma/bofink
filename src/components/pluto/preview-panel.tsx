'use client'

import { PreviewFrame } from './preview-frame'
import { usePreviewUrl } from '@/hooks/use-preview-url'
import { cn } from '@/lib/utils'

interface PreviewPanelProps {
  projectId: string
  sandboxId: string | null
  isBuilding: boolean
  refreshKey?: number
  noPadding?: boolean
}

export function PreviewPanel({
  projectId,
  sandboxId,
  isBuilding,
  refreshKey = 0,
  noPadding = false,
}: PreviewPanelProps) {
  const { data: previewUrl, isLoading: previewLoading } = usePreviewUrl(projectId, sandboxId, isBuilding)

  return (
    <div className={cn('flex h-full flex-col', !noPadding && 'px-3 pb-3')}>
      <PreviewFrame
        url={previewUrl ?? null}
        isLoading={isBuilding || previewLoading}
        refreshKey={refreshKey}
        className="h-full"
        noPadding={noPadding}
      />
    </div>
  )
}
