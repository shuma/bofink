import { useQuery } from '@tanstack/react-query'
import type { FileNode } from '@/types/pluto'

export function useFileTree(projectId: string, sandboxId: string | null) {
  return useQuery({
    queryKey: ['file-tree', projectId, sandboxId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/files?action=tree`)
      if (!res.ok) throw new Error('Failed to fetch file tree')
      const data = await res.json()
      return data.tree as FileNode[]
    },
    enabled: !!sandboxId,
  })
}
