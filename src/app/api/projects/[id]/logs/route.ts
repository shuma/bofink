import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { DBBuildLog } from '@/types/pluto'

// GET - Load build logs for a project
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '500', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  try {
    const supabase = await createClient()

    // Check user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch build logs ordered by creation time
    const { data: logs, error, count } = await supabase
      .from('build_logs')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching build logs:', error)
      return Response.json({ error: 'Failed to fetch build logs' }, { status: 500 })
    }

    return Response.json({
      logs: logs as DBBuildLog[],
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Logs GET error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
