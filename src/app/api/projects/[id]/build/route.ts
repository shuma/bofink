import { streamText, convertToModelMessages, stepCountIs } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createAdminClient } from '@/lib/supabase/admin'
import * as daytona from '@/lib/daytona/client'
import { createSandboxTools } from '@/lib/pluto/tools'
import { executionAgentPrompt } from '@/lib/pluto/prompts'
import { templateFiles } from '@/lib/pluto/template'
import type { BuildPlan } from '@/types/pluto'

export const maxDuration = 300 // 5 minutes

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params

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

    console.log('Building with plan:', JSON.stringify(plan, null, 2))

    // Get or create sandbox
    let sandboxId = project.daytona_sandbox_id
    let workDir = '/home/daytona'

    if (!sandboxId) {
      // Create new sandbox
      const sandbox = await daytona.createSandbox()
      sandboxId = sandbox.id
      workDir = sandbox.workDir

      const appDir = `${workDir}/app`

      // Create app directory
      await daytona.runCommand(sandboxId, `mkdir -p ${appDir}`, workDir)

      // Scaffold template files directly (faster than git clone)
      console.log('[Build] Scaffolding template files...')
      for (const [filePath, content] of Object.entries(templateFiles)) {
        if (content) { // Skip empty files like favicon placeholder
          const fullPath = `${appDir}/${filePath}`
          // Ensure parent directory exists
          const dir = fullPath.substring(0, fullPath.lastIndexOf('/'))
          await daytona.runCommand(sandboxId, `mkdir -p ${dir}`, workDir)
          await daytona.writeFile(sandboxId, fullPath, content)
        }
      }
      console.log('[Build] Template scaffolded')

      // Install dependencies (5 minute timeout - smaller template = faster)
      console.log('[Build] Installing dependencies...')
      const installResult = await daytona.runCommand(sandboxId, 'bun install 2>&1', appDir, 300)
      console.log(`[Build] bun install exit code: ${installResult.exitCode}`)
      if (installResult.exitCode !== 0) {
        console.error('[Build] bun install failed:', installResult.output.slice(-500))
        throw new Error('bun install failed')
      }
      console.log('[Build] Dependencies installed')

      // Update project with sandbox ID
      await supabase
        .from('projects')
        .update({ daytona_sandbox_id: sandboxId })
        .eq('id', projectId)
    } else {
      // Get working directory for existing sandbox
      workDir = await daytona.getWorkDir(sandboxId)
    }

    const appDir = `${workDir}/app`

    // Create tools for this sandbox
    const tools = createSandboxTools(sandboxId, appDir)

    // For initial builds, construct a detailed message
    // The plan context is also in the system prompt
    const isInitialBuild = !project.daytona_sandbox_id || messages.length <= 1

    const buildMessages = isInitialBuild
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
      : messages

    // Convert UI messages to model messages
    const modelMessages = await convertToModelMessages(buildMessages, { tools })

    // Build system prompt with plan context
    const systemPromptWithPlan = `${executionAgentPrompt}

CURRENT PROJECT PLAN:
App Name: ${plan.name}
Description: ${plan.description || 'No description'}

Features:
${plan.features?.map((f) => `- ${f}`).join('\n') || 'No features specified'}

Build Steps:
${plan.steps?.map((s, i) => `${i + 1}. ${s.title}: ${s.description}`).join('\n') || 'No steps specified'}

Working Directory: ${appDir}
`

    // Stream the agent execution
    // Using sonnet for cost efficiency - opus is 5x more expensive
    const result = streamText({
      model: anthropic('claude-sonnet-4-6'),
      system: systemPromptWithPlan,
      messages: modelMessages,
      tools,
      // Each plan step typically costs ~2 round-trips (read then write), so a
      // multi-step build needs plenty of headroom or it stops half-finished
      // (e.g. components created but never wired into the page).
      stopWhen: stepCountIs(40),
      onFinish: async ({ finishReason, usage, totalUsage }) => {
        // Log token usage for monitoring
        console.log('[Build] Token usage:', {
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
