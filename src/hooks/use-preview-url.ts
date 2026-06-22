import { useQuery } from '@tanstack/react-query'

export function usePreviewUrl(
  projectId: string,
  sandboxId: string | null,
  isBuilding: boolean
) {
  return useQuery({
    queryKey: ['preview-url', projectId, sandboxId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/preview`)
      if (!res.ok) throw new Error('Failed to fetch preview URL')
      const data = await res.json()
      return data.url as string
    },
    enabled: !!sandboxId && !isBuilding,
  })
}
