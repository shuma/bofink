import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as daytona from '@/lib/daytona/client'

// Reset a project's sandbox (delete sandbox and clear from DB)
export async function POST(
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

    // Get project
    const { data: project, error } = await supabase
      .from('projects')
      .select('daytona_sandbox_id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Delete sandbox if it exists
    if (project.daytona_sandbox_id) {
      try {
        console.log(`[Reset] Deleting sandbox ${project.daytona_sandbox_id}...`)
        await daytona.deleteSandbox(project.daytona_sandbox_id)
        console.log('[Reset] Sandbox deleted')
      } catch (err) {
        // Sandbox might already be deleted, continue anyway
        console.error('[Reset] Error deleting sandbox (may already be gone):', err)
      }
    }

    // Clear sandbox ID and reset status
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        daytona_sandbox_id: null,
        preview_url: null,
        preview_expires_at: null,
        status: 'planning',
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .eq('user_id', user.id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      message: 'Sandbox reset. Next build will create a fresh sandbox with the new template.',
    })
  } catch (error) {
    console.error('[Reset] Error:', error)
    return NextResponse.json(
      { error: 'Failed to reset sandbox' },
      { status: 500 }
    )
  }
}
