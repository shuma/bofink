import { streamText, convertToModelMessages, stepCountIs } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createClient } from '@/lib/supabase/server'
import * as daytona from '@/lib/daytona/client'
import { createSandboxTools } from '@/lib/pluto/tools'
import { modificationAgentPrompt } from '@/lib/pluto/prompts'

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

    // Create tools for this sandbox
    const tools = createSandboxTools(sandboxId, appDir)

    // Build context about the project
    const projectContext = `
PROJECT: ${project.name}
DESCRIPTION: ${project.description}
ORIGINAL PROMPT: ${project.prompt}

The application has already been built. The user is requesting modifications.
`

    // Convert UI messages to model messages
    const modelMessages = await convertToModelMessages(messages, { tools })

    // Stream the agent execution
    // Using sonnet for cost efficiency
    const result = streamText({
      model: anthropic('claude-sonnet-4-6'),
      system: `${modificationAgentPrompt}

${projectContext}`,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(25), // Headroom for read+write round-trips per change
      onFinish: async ({ usage, totalUsage }) => {
        // Log token usage for monitoring
        console.log('[Message] Token usage:', {
          inputTokens: totalUsage?.inputTokens,
          outputTokens: totalUsage?.outputTokens,
          totalTokens: totalUsage?.totalTokens,
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
        } catch (err) {
          console.error('Error restarting dev server:', err)
        }
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('Message error:', error)
    return Response.json({ error: 'Failed to process message' }, { status: 500 })
  }
}
