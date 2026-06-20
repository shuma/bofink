'use client'

import { useRouter } from 'next/navigation'
import { ExternalLink, Trash2, MoreVertical } from 'lucide-react'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Project } from '@/types/pluto'

interface ProjectCardProps {
  project: Project
  onDelete?: (id: string) => void
}

function getStatusColor(status: Project['status']) {
  switch (status) {
    case 'ready':
      return 'bg-green-500/20 text-green-600'
    case 'building':
      return 'bg-blue-500/20 text-blue-600'
    case 'error':
      return 'bg-red-500/20 text-red-600'
    case 'planning':
      return 'bg-yellow-500/20 text-yellow-600'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const router = useRouter()

  const handleClick = () => {
    router.push(`/projects/${project.id}`)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete) {
      onDelete(project.id)
    }
  }

  const handleOpenPreview = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (project.preview_url) {
      window.open(project.preview_url, '_blank')
    }
  }

  return (
    <Card
      className={cn(
        'p-4 cursor-pointer transition-all duration-200',
        'hover:shadow-md hover:ring-1 hover:ring-border/60'
      )}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate">{project.name}</h3>
          {project.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {project.description}
            </p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {project.preview_url && (
              <DropdownMenuItem onClick={handleOpenPreview}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Preview
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center justify-between mt-4">
        <span
          className={cn(
            'px-2 py-0.5 text-xs font-medium rounded-full',
            getStatusColor(project.status)
          )}
        >
          {project.status}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatDate(project.created_at)}
        </span>
      </div>
    </Card>
  )
}
