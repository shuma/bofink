'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { ProjectCard } from '@/components/pluto/project-card'
import { PlutoOrb } from '@/components/pluto/pluto-orb'
import { createClient } from '@/lib/supabase/client'
import type { Project } from '@/types/pluto'

export default function DashboardPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/projects')
        if (!res.ok) {
          throw new Error('Failed to fetch projects')
        }
        const data = await res.json()
        setProjects(data)
      } catch (err) {
        console.error('Error fetching projects:', err)
        setError('Failed to load projects')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProjects()
  }, [])

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) {
      return
    }

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete project')
      }

      setProjects((prev) => prev.filter((p) => p.id !== projectId))
    } catch (err) {
      console.error('Error deleting project:', err)
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="min-h-svh bg-background">
      {/* Header */}
      <header className="border-b border-border/40 sticky top-0 z-10 bg-background">
        <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-6 lg:px-8">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2.5 hover:opacity-70 transition-opacity"
          >
            <PlutoOrb size={24} />
            <span className="font-heading text-base font-semibold">Pluto</span>
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium text-primary-foreground bg-foreground rounded-full hover:bg-foreground/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>New Project</span>
            </button>
            <button
              onClick={handleSignOut}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-10">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <h1 className="text-xl font-heading font-semibold text-foreground mb-8">
            My Projects
          </h1>

          {isLoading && (
            <div className="flex items-center justify-center py-24">
              <PlutoOrb size={32} speed={20} />
            </div>
          )}

          {error && (
            <div className="text-center py-24">
              <p className="text-sm text-destructive mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-sm font-medium text-foreground hover:text-foreground/80 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {!isLoading && !error && projects.length === 0 && (
            <div className="text-center py-24">
              <div className="mx-auto mb-4 w-fit">
                <PlutoOrb size={40} />
              </div>
              <h2 className="text-base font-medium text-foreground mb-1">No projects yet</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Start building your first app
              </p>
              <button
                onClick={() => router.push('/')}
                className="inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium text-primary-foreground bg-foreground rounded-full hover:bg-foreground/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Create Project</span>
              </button>
            </div>
          )}

          {!isLoading && !error && projects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
