'use client'

import { PreviewFrame } from './preview-frame'
import { usePreviewUrl } from '@/hooks/use-preview-url'

interface PreviewPanelProps {
  projectId: string
  sandboxId: string | null
  isBuilding: boolean
  refreshKey?: number
}

export function PreviewPanel({
  projectId,
  sandboxId,
  isBuilding,
  refreshKey = 0,
}: PreviewPanelProps) {
  const { data: previewUrl, isLoading: previewLoading } = usePreviewUrl(projectId, sandboxId, isBuilding)

  return (
    <div className="flex h-full flex-col px-3 pb-3">
      <PreviewFrame
        url={previewUrl ?? null}
        isLoading={isBuilding || previewLoading}
        refreshKey={refreshKey}
        className="h-full"
      />
    </div>
  )
}
