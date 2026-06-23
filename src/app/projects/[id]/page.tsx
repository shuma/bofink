'use client'

import { useEffect, useState, useCallback, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BuildWorkspace } from '@/components/pluto/build-workspace'
import { createClient } from '@/lib/supabase/client'
import { useProjectRealtime } from '@/hooks/use-realtime'
import { usePersistedChat } from '@/hooks/use-persisted-chat'
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

  // Persisted chat hook for build/modify agent
  // Uses /build for initial builds, /message for modifications to ready projects
  const {
    messages,
    sendMessage,
    status,
    addToolResult,
    stop,
    isLoadingHistory,
  } = usePersistedChat({
    projectId,
    projectStatus: project?.status,
    hasSandbox: !!project?.daytona_sandbox_id,
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

      console.log('[Project] Loaded from DB:', {
        id: data.id,
        status: data.status,
        hasSandbox: !!data.daytona_sandbox_id,
        sandboxId: data.daytona_sandbox_id,
      })

      setProject(data)
      setIsLoading(false)
    }

    fetchProject()
  }, [projectId])

  // Trigger initial build after history is loaded (if needed)
  useEffect(() => {
    // Wait for both project and history to load
    if (!project || isLoadingHistory) return

    console.log('[Project] Status check:', {
      status: project.status,
      hasSandbox: !!project.daytona_sandbox_id,
      messageCount: messages.length,
      buildStarted: buildStartedRef.current,
    })

    // If project is in building status and no messages from history, start the build.
    // The ref guard prevents a duplicate build from StrictMode's double effect.
    // IMPORTANT: Only trigger for 'building' status, never for 'ready' projects
    if (project.status === 'building' && messages.length === 0 && !buildStartedRef.current) {
      buildStartedRef.current = true
      console.log('[Project] Triggering initial build...')
      // Send a trigger message - the route will use the plan for context
      sendMessage({ text: 'Build the application.' })
    }
  }, [project, isLoadingHistory, messages.length, sendMessage])

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

  if (isLoading || isLoadingHistory) {
    return (
      <div className="min-h-svh bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">
            {isLoading ? 'Loading project...' : 'Loading conversation history...'}
          </p>
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
    <div className="h-svh bg-background">
      <BuildWorkspace
        project={project}
        messages={messages}
        isBuilding={isChatLoading}
        onSendMessage={handleSendMessage}
        onStop={stop}
        onAskUserResponse={handleAskUserResponse}
        askUserRequest={askUserRequest}
        onBack={() => router.push('/dashboard')}
      />
    </div>
  )
}
