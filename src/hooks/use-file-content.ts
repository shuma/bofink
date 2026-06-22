import { useQuery } from '@tanstack/react-query'

export function useFileContent(projectId: string, filePath: string | null) {
  return useQuery({
    queryKey: ['file-content', projectId, filePath],
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/files?action=content&path=${encodeURIComponent(filePath!)}`
      )
      if (!res.ok) throw new Error('Failed to fetch file content')
      const data = await res.json()
      return data.content as string
    },
    enabled: !!filePath,
  })
}
