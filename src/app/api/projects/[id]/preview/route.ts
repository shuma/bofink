import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as daytona from '@/lib/daytona/client'

// Get a fresh preview URL for a project
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params

  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: project, error } = await supabase
      .from('projects')
      .select('daytona_sandbox_id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!project.daytona_sandbox_id) {
      return NextResponse.json(
        { error: 'No sandbox available' },
        { status: 400 }
      )
    }

    console.log(`[Preview] Ensuring sandbox ${project.daytona_sandbox_id} is running...`)

    // Ensure sandbox is running and dev server is started
    await daytona.ensureSandboxRunning(project.daytona_sandbox_id)

    console.log(`[Preview] Sandbox running, generating signed preview URL...`)

    // Generate a fresh signed preview URL
    const previewUrl = await daytona.getPreviewUrl(
      project.daytona_sandbox_id,
      3000
    )

    // Verify URL was generated
    if (!previewUrl) {
      console.error('[Preview] Failed to generate preview URL - empty result')
      return NextResponse.json(
        { error: 'Failed to generate preview URL' },
        { status: 500 }
      )
    }

    console.log(`[Preview] Generated URL: ${previewUrl.substring(0, 100)}...`)

    // Probe the proxy URL until it responds (absorbs proxy-registration lag) so
    // the iframe only loads a working URL. Still return the URL on timeout so
    // the client can retry.
    const ready = await daytona.waitForPreviewReady(previewUrl)
    if (!ready) {
      console.warn('[Preview] waitForPreviewReady timed out, returning URL anyway')
    }

    return NextResponse.json({ url: previewUrl })
  } catch (error) {
    console.error('[Preview] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to get preview URL: ${message}` },
      { status: 500 }
    )
  }
}
