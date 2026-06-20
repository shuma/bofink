'use client'

import { useEffect, useState, useCallback, use, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Button } from '@/components/ui/button'
import { BuildWorkspace } from '@/components/pluto/build-workspace'
import { createClient } from '@/lib/supabase/client'
import { useProjectRealtime } from '@/hooks/use-realtime'
import { cn } from '@/lib/utils'
import type { Project, AskUserRequest } from '@/types/pluto'

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: projectId } = use(params)
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [askUserRequest, setAskUserRequest] = useState<AskUserRequest | null>(null)
  // Guard so the initial build is only triggered once (StrictMode double-invokes effects)
  const buildStartedRef = useRef(false)

  // Create transport for this project
  const transport = useMemo(
    () => new DefaultChatTransport({ api: `/api/projects/${projectId}/build` }),
    [projectId]
  )

  // Chat hook for build agent
  const {
    messages,
    sendMessage,
    status,
    addToolResult,
    stop,
  } = useChat({
    transport,
    onError: (err) => {
      console.error('Chat error:', err)
      setError('Build failed. Please try again.')
    },
  })

  const isChatLoading = status === 'streaming' || status === 'submitted'

  // Fetch project on mount
  useEffect(() => {
    const fetchProject = async () => {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (fetchError) {
        setError('Project not found')
        setIsLoading(false)
        return
      }

      setProject(data)
      setIsLoading(false)

      // If project is in building status and no messages, start the build.
      // The ref guard prevents a duplicate build from StrictMode's double effect.
      if (data.status === 'building' && messages.length === 0 && !buildStartedRef.current) {
        buildStartedRef.current = true
        // Send a trigger message - the route will use the plan for context
        sendMessage({ text: 'Build the application.' })
      }
    }

    fetchProject()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // Listen for realtime updates
  useProjectRealtime(projectId, (updatedProject) => {
    setProject(updatedProject)
  })

  // Handle tool calls that need user input (askUser)
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === 'assistant' && lastMessage.parts) {
      for (const part of lastMessage.parts) {
        // Check for tool parts with askUser
        if ('toolCallId' in part && 'state' in part) {
          const toolPart = part as { toolCallId: string; state: string; input?: unknown }
          // This is a tool invocation - check if it's askUser
          if (toolPart.state === 'input-available' && toolPart.input) {
            const input = toolPart.input as {
              question?: string
              options?: { label: string; value: string }[]
              allowCustom?: boolean
            }
            if (input.question) {
              setAskUserRequest({
                id: toolPart.toolCallId,
                question: input.question,
                options: input.options,
                allowCustom: input.allowCustom,
              })
            }
          }
        }
      }
    }
  }, [messages])

  const handleSendMessage = useCallback(
    (message: string) => {
      sendMessage({ text: message })
    },
    [sendMessage]
  )

  const handleAskUserResponse = useCallback(
    (response: string) => {
      if (askUserRequest) {
        addToolResult({
          tool: 'askUser',
          toolCallId: askUserRequest.id,
          output: { value: response, success: true },
        })
        setAskUserRequest(null)
      }
    },
    [askUserRequest, addToolResult]
  )

  if (isLoading) {
    return (
      <div className="min-h-svh bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-svh bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error || 'Project not found'}</p>
        <Button onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="h-svh bg-background flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-border/50 px-3 py-2.5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="group flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-muted"
            aria-label="Back to projects"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary font-heading text-xs font-semibold text-primary-foreground">
              {project.name.charAt(0).toUpperCase()}
            </span>
            <span className="truncate font-heading text-sm font-medium">
              {project.name}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>

          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                project.status === 'ready' && 'bg-green-500',
                project.status === 'building' && 'bg-blue-500 animate-pulse',
                project.status === 'error' && 'bg-red-500',
                project.status === 'planning' && 'bg-yellow-500'
              )}
            />
            <span className="capitalize">{project.status}</span>
          </div>
        </div>
      </header>

      {/* Workspace */}
      <main className="flex-1 min-h-0">
        <BuildWorkspace
          project={project}
          messages={messages}
          isBuilding={isChatLoading}
          onSendMessage={handleSendMessage}
          onStop={stop}
          onAskUserResponse={handleAskUserResponse}
          askUserRequest={askUserRequest}
        />
      </main>
    </div>
  )
}
