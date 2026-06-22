import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { DBMessage, DBBuildLog } from '@/types/pluto'

// Extract build logs from message parts
function extractBuildLogs(
  parts: unknown[],
  projectId: string,
  messageDbId: string
): Omit<DBBuildLog, 'id' | 'created_at'>[] {
  const logs: Omit<DBBuildLog, 'id' | 'created_at'>[] = []

  for (const part of parts) {
    if (typeof part !== 'object' || part === null) continue

    const p = part as Record<string, unknown>

    // Extract from tool-result parts (command outputs)
    if (p.type === 'tool-result' && p.toolName) {
      const toolName = p.toolName as string
      const result = p.result as Record<string, unknown> | undefined

      if (toolName === 'runCommand' && result) {
        // Log the command execution
        const command = (result.command as string) || 'unknown command'
        const output = (result.output as string) || ''
        const exitCode = result.exitCode as number

        logs.push({
          project_id: projectId,
          message_id: messageDbId,
          type: 'command',
          message: command,
          step: null,
        })

        if (output) {
          logs.push({
            project_id: projectId,
            message_id: messageDbId,
            type: exitCode === 0 ? 'output' : 'error',
            message: output.slice(0, 5000), // Limit output size
            step: null,
          })
        }
      } else if (toolName === 'writeFile' && result) {
        const path = (result.path as string) || 'unknown file'
        logs.push({
          project_id: projectId,
          message_id: messageDbId,
          type: 'info',
          message: `Created/updated file: ${path}`,
          step: null,
        })
      } else if (toolName === 'readFile' && result) {
        const path = (result.path as string) || 'unknown file'
        logs.push({
          project_id: projectId,
          message_id: messageDbId,
          type: 'info',
          message: `Read file: ${path}`,
          step: null,
        })
      }
    }

    // Extract from text parts that look like status updates
    if (p.type === 'text' && typeof p.text === 'string') {
      const text = p.text as string
      // Look for step indicators in assistant messages
      if (text.includes('Step') || text.includes('Creating') || text.includes('Installing')) {
        logs.push({
          project_id: projectId,
          message_id: messageDbId,
          type: 'info',
          message: text.slice(0, 500),
          step: null,
        })
      }
    }
  }

  return logs
}

// GET - Load messages for a project with optional pagination
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '100', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  try {
    const supabase = await createClient()

    // Check user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch messages ordered by sequence number
    const { data: messages, error, count } = await supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId)
      .order('sequence_num', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching messages:', error)
      return Response.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    return Response.json({
      messages: messages as DBMessage[],
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Messages GET error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Save messages (upsert by message_id)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params

  try {
    const supabase = await createClient()

    // Check user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return Response.json({ error: 'Project not found' }, { status: 404 })
    }

    const body = await req.json()
    const { messages } = body as { messages: Array<{
      message_id: string
      role: 'system' | 'user' | 'assistant'
      parts: unknown[]
      metadata?: unknown
      sequence_num: number
    }> }

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: 'Invalid messages format' }, { status: 400 })
    }

    // Prepare records for upsert
    const records = messages.map((msg) => ({
      project_id: projectId,
      message_id: msg.message_id,
      role: msg.role,
      parts: msg.parts,
      metadata: msg.metadata || null,
      sequence_num: msg.sequence_num,
    }))

    // Upsert messages (update if message_id already exists)
    const { data: savedMessages, error } = await supabase
      .from('messages')
      .upsert(records, {
        onConflict: 'project_id,message_id',
        ignoreDuplicates: false,
      })
      .select()

    if (error) {
      console.error('Error saving messages:', error)
      return Response.json({ error: 'Failed to save messages' }, { status: 500 })
    }

    // Extract and save build logs from assistant messages
    if (savedMessages && savedMessages.length > 0) {
      const allLogs: Omit<DBBuildLog, 'id' | 'created_at'>[] = []

      for (const savedMsg of savedMessages) {
        if (savedMsg.role === 'assistant' && Array.isArray(savedMsg.parts)) {
          const logs = extractBuildLogs(savedMsg.parts, projectId, savedMsg.id)
          allLogs.push(...logs)
        }
      }

      if (allLogs.length > 0) {
        const { error: logsError } = await supabase
          .from('build_logs')
          .insert(allLogs)

        if (logsError) {
          // Log but don't fail - build logs are secondary
          console.error('Error saving build logs:', logsError)
        }
      }
    }

    return Response.json({ success: true, count: records.length })
  } catch (error) {
    console.error('Messages POST error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Clear conversation history for a project
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params

  try {
    const supabase = await createClient()

    // Check user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete all messages for this project (RLS ensures user owns project)
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('project_id', projectId)

    if (error) {
      console.error('Error deleting messages:', error)
      return Response.json({ error: 'Failed to delete messages' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Messages DELETE error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
