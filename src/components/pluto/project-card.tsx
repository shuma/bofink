'use client'

import { useRouter } from 'next/navigation'
import { ExternalLink, Link2, Trash2, MoreHorizontal } from 'lucide-react'
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
      return 'bg-[#0358F7]/10 text-[#0358F7]'
    case 'building':
      // Dia magenta
      return 'bg-[#FD02F5]/10 text-[#D001CC]'
    case 'error':
      // Dia red
      return 'bg-[#FA3D1D]/10 text-[#FA3D1D]'
    case 'planning':
      // Dia yellow (darker text for readability)
      return 'bg-[#FFD400]/15 text-[#B89700]'
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
    <article
      className={cn(
        'group relative flex flex-col rounded-[20px] border border-[#00000029] bg-white p-5 cursor-pointer',
        'shadow-[0_1px_2px_0_#00000005] transition-shadow duration-150',
        'hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)]'
      )}
      onClick={handleClick}
    >
      {/* Header row: title + link + menu */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 truncate font-['Inter_Display',var(--font-sans)] text-base font-semibold leading-6 tracking-[0.012em] text-foreground">
          {project.name}
        </h3>
        <div className="flex shrink-0 items-center gap-1 -mr-1 -mt-0.5">
          <button
            onClick={handleOpenPreview}
            aria-label="Open preview"
            className={cn(
              'h-7 w-7 inline-flex items-center justify-center rounded-md',
              'text-muted-foreground transition-colors',
              'hover:bg-muted hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              !project.preview_url && 'opacity-40'
            )}
          >
            <Link2 className="h-4 w-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'h-7 w-7 inline-flex items-center justify-center rounded-md',
                'text-muted-foreground transition-colors',
                'hover:bg-muted hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
              )}
            >
              <MoreHorizontal className="h-4 w-4" />
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
      </div>

      {/* Description */}
      {project.description && (
        <p className="mt-2 font-['Inter_Display',var(--font-sans)] text-base font-medium leading-6 tracking-[0.012em] text-[#00000080] line-clamp-2">
          {project.description}
        </p>
      )}

      {/* Footer: status + date */}
      <div className="flex items-center justify-between mt-auto pt-5">
        <span
          className={cn(
            'inline-flex items-center capitalize rounded-md px-2.5 py-1 font-["Inter_Display",var(--font-sans)] text-[13px] font-medium tracking-[0.012em]',
            getStatusStyles(project.status)
          )}
        >
          {project.status}
        </span>
        <span className="rounded-md bg-[#F0F0EF] px-2.5 py-1 font-['Inter_Display',var(--font-sans)] text-[13px] font-medium tracking-[0.012em] text-foreground/70 tabular-nums">
          {formatDate(project.created_at)}
        </span>
      </div>
    </article>
  )
}
