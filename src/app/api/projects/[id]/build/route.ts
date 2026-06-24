import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createAdminClient } from '@/lib/supabase/admin'
import * as daytona from '@/lib/daytona/client'
import { acquireSandbox, isSandboxPreWarmed } from '@/lib/daytona/pool'
import { createSandboxTools } from '@/lib/pluto/tools'
import { executionAgentPrompt } from '@/lib/pluto/prompts'
import { scaffoldTemplate } from '@/lib/pluto/template-archive'
import { recordTokens, recordTiming } from '@/lib/metrics/sandbox'
import { compressConversation, needsSummarization } from '@/lib/pluto/conversation'
import { getProjectMemory, createProjectMemory } from '@/lib/memory'
import type { BuildPlan } from '@/types/pluto'

/**
 * Check if a message part has incomplete tool calls
 */
function isIncompleteToolPart(part: unknown): boolean {
  if (typeof part !== 'object' || part === null) return false
  const p = part as Record<string, unknown>

  // Check for tool invocation types
  if ('type' in p && typeof p.type === 'string') {
    const type = p.type as string
    if (type === 'tool-invocation' || type === 'tool-call' || type.includes('tool')) {
      const state = p.state as string | undefined
      // 'result' is complete, everything else is incomplete
      if (state && state !== 'result') {
        return true
      }
      // No state but has toolName without output = incomplete
      if (!state && p.toolName && !('output' in p) && !('result' in p)) {
        return true
      }
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

      // Check for tool call/result pairs
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

      // Find incomplete tool call IDs
      const incompleteIds = new Set<string>()
      for (const callId of toolCallIds) {
        if (!toolResultIds.has(callId)) {
          incompleteIds.add(callId)
        }
      }

      // Filter out incomplete parts
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

      // Check if any meaningful content remains
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

export const maxDuration = 300 // 5 minutes

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  const buildStartTime = Date.now()

  try {
    const body = await req.json()
    const { messages = [] } = body

    // Get project from database
    const supabase = createAdminClient()
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return Response.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const plan: BuildPlan = project.plan

    // Validate plan exists
    if (!plan || !plan.name || !plan.features || !plan.steps) {
      console.error('Invalid or missing plan:', JSON.stringify(plan, null, 2))
      return Response.json(
        { error: 'Project has no valid build plan. Please create a plan first.' },
        { status: 400 }
      )
    }

    // Get or create sandbox
    let sandboxId = project.daytona_sandbox_id
    let workDir = '/home/daytona'
    let wasPreWarmed = false

    if (!sandboxId) {
      // Try to acquire from pool first (warm start) or create new (cold start)
      const acquireStartTime = Date.now()

      try {
        const acquired = await acquireSandbox(projectId)
        sandboxId = acquired.sandboxId
        workDir = acquired.workDir
        wasPreWarmed = acquired.wasPreWarmed

        const acquireTime = Date.now() - acquireStartTime
        recordTiming({
          name: wasPreWarmed ? 'sandbox_warm_start' : 'sandbox_cold_start',
          durationMs: acquireTime,
          sandboxId,
          projectId,
        })
        console.log(`[Build] Acquired sandbox ${sandboxId} in ${acquireTime}ms (preWarmed: ${wasPreWarmed})`)
      } catch (acquireError) {
        console.error('[Build] Failed to acquire from pool, falling back to direct create:', acquireError)

        // Fallback: create sandbox directly (original behavior)
        const sandbox = await daytona.createSandbox()
        sandboxId = sandbox.id
        workDir = sandbox.workDir
        wasPreWarmed = false
      }

      const appDir = `${workDir}/app`

      // Only scaffold and install if not pre-warmed
      if (!wasPreWarmed) {
        // Use archive-based scaffolding (faster)
        console.log('[Build] Scaffolding template files...')
        const scaffoldStartTime = Date.now()
        const scaffoldResult = await scaffoldTemplate(sandboxId, appDir)
        const scaffoldTime = Date.now() - scaffoldStartTime

        recordTiming({
          name: 'template_scaffold',
          durationMs: scaffoldTime,
          sandboxId,
          metadata: { method: scaffoldResult.method },
        })

        if (!scaffoldResult.success) {
          throw new Error('Template scaffolding failed')
        }
        console.log(`[Build] Template scaffolded via ${scaffoldResult.method} in ${scaffoldTime}ms`)

        // Install dependencies
        console.log('[Build] Installing dependencies...')
        const installStartTime = Date.now()
        const installResult = await daytona.runCommand(sandboxId, 'bun install 2>&1', appDir, 300)
        const installTime = Date.now() - installStartTime

        recordTiming({
          name: 'dependency_install',
          durationMs: installTime,
          sandboxId,
        })

        console.log(`[Build] bun install completed in ${installTime}ms (exit: ${installResult.exitCode})`)
        if (installResult.exitCode !== 0) {
          console.error('[Build] bun install failed:', installResult.output.slice(-500))
          throw new Error('bun install failed')
        }
      } else {
        console.log('[Build] Skipping scaffolding and install (pre-warmed sandbox)')
      }

      // Update project with sandbox ID
      await supabase
        .from('projects')
        .update({ daytona_sandbox_id: sandboxId })
        .eq('id', projectId)

      const setupTime = Date.now() - buildStartTime
      console.log(`[Build] Sandbox setup complete in ${setupTime}ms`)
    } else {
      // Get working directory for existing sandbox
      workDir = await daytona.getWorkDir(sandboxId)

      // Check if it's pre-warmed (has deps installed)
      wasPreWarmed = await isSandboxPreWarmed(sandboxId)
    }

    const appDir = `${workDir}/app`

    // Create tools for this sandbox (with projectId for memory operations)
    const tools = createSandboxTools(sandboxId, appDir, projectId)

    // Initialize project memory for new builds
    const isInitialBuild = !project.daytona_sandbox_id || messages.length <= 1
    if (isInitialBuild) {
      try {
        await getProjectMemory(projectId)
        console.log('[Build] Initialized project memory')
      } catch (err) {
        console.warn('[Build] Failed to initialize project memory:', err)
      }
    }

    // For initial builds, construct a detailed message
    // The plan context is also in the system prompt
    let buildMessages = isInitialBuild
      ? [{
          id: 'initial-build',
          role: 'user' as const,
          parts: [{
            type: 'text' as const,
            text: `Build the application according to the plan in your system prompt.

WORKING DIRECTORY: ${appDir}

Start by listing files in ${appDir} to understand the template structure, then implement each feature step by step.`,
          }],
        }]
      : cleanMessages(messages)

    if (isInitialBuild) {
      console.log(`[Build] Initial build for "${plan.name}" with ${plan.steps?.length || 0} steps`)
    } else {
      console.log(`[Build] Continuation for "${plan.name}" (${buildMessages.length} messages)`)
    }

    // Compress conversation if it's getting too long
    if (!isInitialBuild && needsSummarization(buildMessages)) {
      console.log('[Build] Compressing conversation history...')
      const compressed = await compressConversation(buildMessages)
      if (compressed.wasSummarized) {
        console.log(`[Build] Conversation compressed, saved ~${compressed.tokensSaved} tokens`)
        buildMessages = compressed.messages
      }
    }

    // If no valid messages remain after cleaning, treat as initial build
    if (buildMessages.length === 0) {
      console.log('[Build] No valid messages after cleaning, treating as initial build')
      buildMessages = [{
        id: 'initial-build',
        role: 'user' as const,
        parts: [{
          type: 'text' as const,
          text: `Build the application according to the plan in your system prompt.

WORKING DIRECTORY: ${appDir}

Start by listing files in ${appDir} to understand the template structure, then implement each feature step by step.`,
        }],
      }]
    }

    // Convert UI messages to model messages
    const modelMessages = await convertToModelMessages(buildMessages, { tools })

    // Build system prompt - only include full plan for initial builds
    // For continuations (modifications), use a lighter context
    let systemPrompt: string

    if (isInitialBuild) {
      // Full plan for initial build
      systemPrompt = `${executionAgentPrompt}

CURRENT PROJECT PLAN:
App Name: ${plan.name}
Description: ${plan.description || 'No description'}

Features:
${plan.features?.map((f) => `- ${f}`).join('\n') || 'No features specified'}

Build Steps:
${plan.steps?.map((s, i) => `${i + 1}. ${s.title}: ${s.description}`).join('\n') || 'No steps specified'}

Working Directory: ${appDir}
`
    } else {
      // Lighter context for continuations/modifications
      systemPrompt = `${executionAgentPrompt}

PROJECT: ${plan.name}
DESCRIPTION: ${plan.description || 'No description'}
WORKING DIRECTORY: ${appDir}

The application has already been built. The user is requesting modifications.
Use the available tools to inspect files and make changes as needed.
`
    }

    console.log(`[Build] System prompt size: ${systemPrompt.length} chars (${isInitialBuild ? 'initial' : 'continuation'})`)

    // Stream the agent execution using AI SDK directly
    const result = streamText({
      model: anthropic('claude-sonnet-4-6'),
      system: systemPrompt,
      messages: modelMessages,
      tools,
      // Each plan step typically costs ~2 round-trips (read then write), so a
      // multi-step build needs plenty of headroom or it stops half-finished
      // (e.g. components created but never wired into the page).
      stopWhen: stepCountIs(40),
      onFinish: async ({ finishReason, usage, totalUsage }) => {
        const totalBuildTime = Date.now() - buildStartTime

        // Record token metrics
        if (totalUsage) {
          recordTokens({
            projectId,
            sandboxId: sandboxId!,
            inputTokens: totalUsage.inputTokens || 0,
            outputTokens: totalUsage.outputTokens || 0,
            totalTokens: totalUsage.totalTokens || 0,
          })
        }

        // Log for monitoring
        console.log('[Build] Completed:', {
          projectId,
          sandboxId,
          wasPreWarmed,
          totalBuildTimeMs: totalBuildTime,
          inputTokens: totalUsage?.inputTokens,
          outputTokens: totalUsage?.outputTokens,
          totalTokens: totalUsage?.totalTokens,
        })

        // When agent finishes, start dev server and get preview URL
        if (finishReason === 'stop' || finishReason === 'tool-calls') {
          try {
            // Use ensureSandboxRunning which has robust dev server startup logic
            // (managed session + strict readiness check)
            await daytona.ensureSandboxRunning(sandboxId!)

            // Get preview URL
            const previewUrl = await daytona.getPreviewUrl(sandboxId!, 3000)

            // Probe the proxy URL before marking the project ready so the
            // "ready" state is honest.
            const ready = await daytona.waitForPreviewReady(previewUrl)
            if (!ready) {
              console.warn('[Build] waitForPreviewReady timed out, marking ready anyway')
            }

            // Update project status
            await supabase
              .from('projects')
              .update({
                status: 'ready',
                preview_url: previewUrl,
                preview_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
              })
              .eq('id', projectId)
          } catch (err) {
            console.error('Error starting dev server:', err)
            await supabase
              .from('projects')
              .update({ status: 'error' })
              .eq('id', projectId)
          }
        }
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('Build error:', error)
    return Response.json(
      { error: 'Build failed' },
      { status: 500 }
    )
  }
}
