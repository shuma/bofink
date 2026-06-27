'use client'

import { useRouter } from 'next/navigation'
import { ExternalLink, Trash2, MoreVertical } from 'lucide-react'
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

function getStatusStyles(status: Project['status']) {
  switch (status) {
    case 'ready':
      // Dia blue
      return 'bg-[#0358F7]/10 text-[#0358F7] ring-[#0358F7]/20'
    case 'building':
      // Dia magenta
      return 'bg-[#FD02F5]/10 text-[#D001CC] ring-[#FD02F5]/20'
    case 'error':
      // Dia red
      return 'bg-[#FA3D1D]/10 text-[#FA3D1D] ring-[#FA3D1D]/20'
    case 'planning':
      // Dia yellow (darker text for readability)
      return 'bg-[#FFD400]/15 text-[#B89700] ring-[#FFD400]/30'
    default:
      return 'bg-muted text-muted-foreground ring-border'
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
    <article
      className={cn(
        'group relative flex flex-col rounded-xl bg-card p-4 cursor-pointer',
        'ring-1 ring-border/50 transition-all duration-150',
        'hover:ring-border hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)]'
      )}
      onClick={handleClick}
    >
      {/* Header row: title + menu */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-heading text-[15px] font-medium text-foreground leading-snug truncate">
          {project.name}
        </h3>
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'shrink-0 -mr-1 -mt-0.5 h-7 w-7 inline-flex items-center justify-center rounded-md',
              'text-muted-foreground/60 transition-colors',
              'hover:bg-muted hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              'opacity-0 group-hover:opacity-100'
            )}
          >
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[140px]">
            {project.preview_url && (
              <DropdownMenuItem onClick={handleOpenPreview}>
                <ExternalLink className="h-3.5 w-3.5 mr-2" />
                Open Preview
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-[13px] leading-relaxed text-muted-foreground line-clamp-2 mt-1.5">
          {project.description}
        </p>
      )}

      {/* Footer: status + date */}
      <div className="flex items-center justify-between mt-auto pt-4">
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md ring-1 ring-inset',
            getStatusStyles(project.status)
          )}
        >
          {project.status}
        </span>
        <span className="text-[11px] text-muted-foreground/70 tabular-nums">
          {formatDate(project.created_at)}
        </span>
      </div>
    </article>
  )
}
