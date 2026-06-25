import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { getModelForTask, getModelId } from '@/lib/ai'
import * as daytona from '@/lib/daytona/client'
import { createSandboxTools } from '@/lib/pluto/tools'
import { modificationAgentPrompt } from '@/lib/pluto/prompts'
import { buildProjectContext, formatContextForLLM } from '@/lib/pluto/summarizer'
import * as sandboxState from '@/lib/daytona/state'
import { recordTokens } from '@/lib/metrics/sandbox'
import {
  compressConversation,
  needsSummarization,
  formatMessagesForContext,
  getMessageTokenCount,
} from '@/lib/pluto/conversation'
import {
  buildFocusedContext,
  formatFocusedContext,
  createContextState,
} from '@/lib/pluto/context'
import { getProjectMemory, formatMemoryForLLM } from '@/lib/memory'

export const maxDuration = 300 // 5 minutes

/**
 * Check if a message part has incomplete tool calls
 */
function isIncompleteToolPart(part: unknown): boolean {
  if (typeof part !== 'object' || part === null) return false
  const p = part as Record<string, unknown>

  if ('type' in p && typeof p.type === 'string') {
    const type = p.type as string
    if (type === 'tool-invocation' || type === 'tool-call' || type.includes('tool')) {
      const state = p.state as string | undefined
      if (state && state !== 'result') return true
      if (!state && p.toolName && !('output' in p) && !('result' in p)) return true
    }
  }
  return false
}

/**
 * Clean messages by removing incomplete tool calls
 */
function cleanMessages(messages: UIMessage[]): UIMessage[] {
  return messages
    .map((msg) => {
      if (!msg.parts || !Array.isArray(msg.parts)) return msg

      const toolCallIds = new Set<string>()
      const toolResultIds = new Set<string>()

      for (const part of msg.parts) {
        if (typeof part !== 'object' || part === null) continue
        const p = part as Record<string, unknown>
        if (p.toolCallId && typeof p.toolCallId === 'string') {
          if (p.toolName && !('output' in p) && !('result' in p)) {
            toolCallIds.add(p.toolCallId)
          }
          if ('output' in p || 'result' in p) {
            toolResultIds.add(p.toolCallId)
          }
        }
      }

      const incompleteIds = new Set<string>()
      for (const callId of toolCallIds) {
        if (!toolResultIds.has(callId)) {
          incompleteIds.add(callId)
        }
      }

      const cleanedParts = msg.parts.filter((part) => {
        if (isIncompleteToolPart(part)) return false
        if (typeof part === 'object' && part !== null) {
          const p = part as Record<string, unknown>
          if (p.toolCallId && typeof p.toolCallId === 'string') {
            if (incompleteIds.has(p.toolCallId)) return false
          }
        }
        return true
      })

      const hasContent = cleanedParts.some((part: unknown) => {
        if (typeof part === 'string' && (part as string).trim()) return true
        if (typeof part === 'object' && part !== null) {
          const p = part as Record<string, unknown>
          if ('text' in p && typeof p.text === 'string' && p.text.trim()) return true
          if (p.type === 'text') return true
        }
        return false
      })

      if (!hasContent && cleanedParts.length === 0) return null

      return { ...msg, parts: cleanedParts as UIMessage['parts'] }
    })
    .filter((msg): msg is UIMessage => msg !== null && msg.parts.length > 0)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  const requestStartTime = Date.now()

  try {
    const body = await req.json()
    let { messages = [] } = body

    // Clean messages to remove incomplete tool calls that cause SDK errors
    messages = cleanMessages(messages)
    console.log(`[Message] Cleaned messages: ${messages.length} valid messages`)

    if (messages.length === 0) {
      return Response.json(
        { error: 'No valid messages to process' },
        { status: 400 }
      )
    }

    // Get project from database
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return Response.json({ error: 'Project not found' }, { status: 404 })
    }

    // Ensure project has a sandbox
    if (!project.daytona_sandbox_id) {
      return Response.json(
        { error: 'Project has no sandbox' },
        { status: 400 }
      )
    }

    const sandboxId = project.daytona_sandbox_id

    // Get sandbox working directory
    const workDir = await daytona.getWorkDir(sandboxId)
    const appDir = `${workDir}/app`

    // Record activity to keep sandbox alive
    await sandboxState.recordActivity(sandboxId).catch(() => {})

    // Create tools for this sandbox (with projectId for memory operations)
    const tools = await createSandboxTools(sandboxId, appDir, projectId)

    // Load project memory for context
    let memoryContext = ''
    try {
      const memory = await getProjectMemory(projectId)
      memoryContext = formatMemoryForLLM(memory)
      console.log(`[Message] Loaded project memory (${memory.decisions.length} decisions, ${memory.tasks.length} tasks)`)
    } catch (err) {
      console.warn('[Message] Failed to load project memory:', err)
    }

    // Extract user's latest message for context-aware retrieval
    const latestUserMessage = messages
      .filter((m: { role: string }) => m.role === 'user')
      .pop()
    const userRequest = latestUserMessage?.content || latestUserMessage?.parts?.[0]?.text || ''

    // Track original token count for metrics
    const originalTokens = getMessageTokenCount(messages)
    let tokensSaved = 0

    // Compress conversation if it's getting too long
    if (needsSummarization(messages)) {
      console.log(`[Message] Compressing conversation (${messages.length} messages, ~${originalTokens} tokens)...`)
      const compressed = await compressConversation(messages)
      if (compressed.wasSummarized) {
        tokensSaved = compressed.tokensSaved
        messages = compressed.messages
        console.log(`[Message] Compressed conversation, saved ~${tokensSaved} tokens`)
      }
    }

    // Format messages to reduce verbose tool outputs
    messages = formatMessagesForContext(messages)

    // Build focused context based on user request
    let projectContextStr = ''
    try {
      // Try focused context first (more efficient)
      const contextState = createContextState()
      const focusedContext = await buildFocusedContext(
        sandboxId,
        appDir,
        userRequest,
        contextState
      )
      projectContextStr = formatFocusedContext(focusedContext)
      console.log(`[Message] Built focused context (~${focusedContext.estimatedTokens} tokens)`)
    } catch (err) {
      console.warn('[Message] Focused context failed, falling back to full context:', err)
      // Fallback to full project context
      try {
        const context = await buildProjectContext(sandboxId, appDir, userRequest)
        projectContextStr = formatContextForLLM(context)
      } catch {
        projectContextStr = `Working directory: ${appDir}`
      }
    }

    // Build context about the project including memory
    const projectContext = `
PROJECT: ${project.name}
DESCRIPTION: ${project.description}
ORIGINAL PROMPT: ${project.prompt}
WORKING DIRECTORY: ${appDir}

The application has already been built. The user is requesting modifications.

${memoryContext ? `## Project Memory\n${memoryContext}\n\n` : ''}${projectContextStr}
`

    // Convert UI messages to model messages
    const modelMessages = await convertToModelMessages(messages, { tools })

    const model = getModelForTask('modification')
    console.log(`[Message] Using model: ${getModelId('modification')}`)

    // Stream the agent execution using AI SDK directly
    const result = streamText({
      model,
      system: `${modificationAgentPrompt}

${projectContext}`,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(25), // Headroom for read+write round-trips per change
      onFinish: async ({ usage, totalUsage }) => {
        const requestDuration = Date.now() - requestStartTime

        // Record token metrics with savings info
        if (totalUsage) {
          recordTokens({
            projectId,
            sandboxId,
            inputTokens: totalUsage.inputTokens || 0,
            outputTokens: totalUsage.outputTokens || 0,
            totalTokens: totalUsage.totalTokens || 0,
            savedBySnippets: tokensSaved,
          })
        }

        // Log for monitoring
        console.log('[Message] Completed:', {
          projectId,
          sandboxId,
          durationMs: requestDuration,
          inputTokens: totalUsage?.inputTokens,
          outputTokens: totalUsage?.outputTokens,
          totalTokens: totalUsage?.totalTokens,
          tokensSaved,
        })

        // Ensure the dev server is live after modifications. File edits are
        // written to disk via the writeFile tool, so vite's watcher picks them
        // up via HMR — no manual restart needed. ensureSandboxRunning detects a
        // live server or restarts it via the managed session if it died.
        try {
          await daytona.ensureSandboxRunning(sandboxId)

          // Get new preview URL
          const previewUrl = await daytona.getPreviewUrl(sandboxId, 3000)

          // Probe the proxy URL before persisting it.
          await daytona.waitForPreviewReady(previewUrl)

          // Update project
          await supabase
            .from('projects')
            .update({
              preview_url: previewUrl,
              preview_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', projectId)

          // Update sandbox state
          await sandboxState.recordDevServerState(sandboxId, true, 3000).catch(() => {})
        } catch (err) {
          console.error('Error restarting dev server:', err)
          await sandboxState.recordBuild(sandboxId, false, String(err)).catch(() => {})
        }
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('Message error:', error)
    return Response.json({ error: 'Failed to process message' }, { status: 500 })
  }
}
