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
    const partType = p.type as string | undefined

    if (!partType) continue

    // Handle tool parts - multiple possible formats from AI SDK:
    // 1. { type: 'tool-result', toolName: 'xxx', result: {...} }
    // 2. { type: 'tool-result', toolName: 'xxx', output: {...} }
    // 3. { type: 'tool-invocation', toolName: 'xxx', state: 'result', result: {...} }
    // 4. { type: 'tool-xxx', result/output/... }
    let toolName: string | undefined
    let result: Record<string, unknown> | undefined

    if (partType === 'tool-result') {
      // Standard result format
      toolName = p.toolName as string | undefined
      result = (p.result as Record<string, unknown>) || (p.output as Record<string, unknown>)
    } else if (partType === 'tool-invocation' && p.state === 'result') {
      // Tool invocation with completed result
      toolName = p.toolName as string | undefined
      result = (p.result as Record<string, unknown>) || (p.output as Record<string, unknown>)
    } else if (partType.startsWith('tool-') && partType !== 'tool-invocation' && partType !== 'tool-call') {
      // Embedded tool name format: type: 'tool-writeFile'
      toolName = partType.replace('tool-', '')
      // Result could be in result, output, or directly in the part
      result = (p.result as Record<string, unknown>) ||
               (p.output as Record<string, unknown>) ||
               p as Record<string, unknown>
    }

    // Also check for toolName at root level with result/output
    if (!toolName && p.toolName && typeof p.toolName === 'string') {
      toolName = p.toolName as string
      result = (p.result as Record<string, unknown>) ||
               (p.output as Record<string, unknown>) ||
               p as Record<string, unknown>
    }

    if (toolName && result) {
      if (toolName === 'runCommand') {
        // Log the command execution
        const command = (result.command as string) || ''
        const output = (result.output as string) || ''
        const exitCode = result.exitCode as number
        const success = result.success as boolean

        if (command) {
          logs.push({
            project_id: projectId,
            message_id: messageDbId,
            type: 'command',
            message: `$ ${command}`,
            step: null,
          })
        }

        if (output) {
          logs.push({
            project_id: projectId,
            message_id: messageDbId,
            type: success ? 'output' : 'error',
            message: output.slice(0, 5000), // Limit output size
            step: null,
          })
        }

        // Handle success message for completed commands
        if (success && exitCode === 0 && !output) {
          logs.push({
            project_id: projectId,
            message_id: messageDbId,
            type: 'success',
            message: `Command completed successfully`,
            step: null,
          })
        }
      } else if (toolName === 'writeFile') {
        const path = (result.path as string) || (result.message as string)?.match(/File written: (.+)/)?.[1] || 'unknown file'
        logs.push({
          project_id: projectId,
          message_id: messageDbId,
          type: 'info',
          message: `Created file: ${path}`,
          step: null,
        })
      } else if (toolName === 'applyEdit') {
        const path = (result.path as string) || 'unknown file'
        const method = (result.method as string) || 'edit'
        logs.push({
          project_id: projectId,
          message_id: messageDbId,
          type: 'info',
          message: `Edited file: ${path} (${method})`,
          step: null,
        })
      } else if (toolName === 'editFile') {
        const path = (result.path as string) || 'unknown file'
        logs.push({
          project_id: projectId,
          message_id: messageDbId,
          type: 'info',
          message: `Edited file: ${path}`,
          step: null,
        })
      } else if (toolName === 'readFile') {
        const path = (result.path as string) || 'unknown file'
        logs.push({
          project_id: projectId,
          message_id: messageDbId,
          type: 'info',
          message: `Reading file: ${path}`,
          step: null,
        })
      } else if (toolName === 'installDependencies') {
        const output = (result.output as string) || ''
        const success = result.success as boolean
        logs.push({
          project_id: projectId,
          message_id: messageDbId,
          type: success ? 'success' : 'error',
          message: output ? output.slice(0, 2000) : (success ? 'Dependencies installed' : 'Install failed'),
          step: null,
        })
      } else if (toolName === 'startProcess') {
        const sessionId = (result.sessionId as string) || ''
        logs.push({
          project_id: projectId,
          message_id: messageDbId,
          type: 'info',
          message: `Started process: ${sessionId || 'dev server'}`,
          step: null,
        })
      } else if (toolName === 'warpGrep') {
        const summary = (result.summary as string) || ''
        const method = (result.method as string) || ''
        logs.push({
          project_id: projectId,
          message_id: messageDbId,
          type: 'info',
          message: `Code search: ${summary || 'searching...'} (${method})`,
          step: null,
        })
      } else if (toolName === 'grep') {
        const totalMatches = (result.totalMatches as number) || 0
        logs.push({
          project_id: projectId,
          message_id: messageDbId,
          type: 'info',
          message: `Found ${totalMatches} matches`,
          step: null,
        })
      } else if (toolName === 'createCheckpoint') {
        const checkpoint = (result.checkpoint as string) || (result.label as string) || ''
        logs.push({
          project_id: projectId,
          message_id: messageDbId,
          type: 'info',
          message: `Checkpoint created: ${checkpoint}`,
          step: null,
        })
      }
    }

    // Extract from text parts that look like status updates
    if (partType === 'text' && typeof p.text === 'string') {
      const text = p.text as string
      // Look for step indicators in assistant messages
      if (text.includes('Step') || text.includes('Creating') || text.includes('Installing') ||
          text.includes('Building') || text.includes('Starting') || text.includes('Completed')) {
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
          console.log(`[Messages] Extracting logs from message ${savedMsg.id}, parts: ${savedMsg.parts.length}`)
          // Log tool-related parts with full detail for debugging
          let toolPartCount = 0
          savedMsg.parts.forEach((p: unknown, i: number) => {
            const part = p as Record<string, unknown>
            const partType = part.type as string | undefined
            // Only log tool-related parts in detail
            if (partType && (partType.includes('tool') || part.toolName)) {
              toolPartCount++
              console.log(`[Messages] Tool part ${i}:`, JSON.stringify({
                type: part.type,
                toolName: part.toolName,
                state: part.state,
                hasResult: 'result' in part,
                hasOutput: 'output' in part,
                keys: Object.keys(part),
              }))
            }
          })
          console.log(`[Messages] Found ${toolPartCount} tool parts`)
          const logs = extractBuildLogs(savedMsg.parts, projectId, savedMsg.id)
          console.log(`[Messages] Extracted ${logs.length} logs from message ${savedMsg.id}`)
          if (logs.length > 0) {
            console.log(`[Messages] Sample logs:`, logs.slice(0, 3).map(l => l.message))
          }
          allLogs.push(...logs)
        }
      }

      console.log(`[Messages] Total logs to save: ${allLogs.length}`)

      if (allLogs.length > 0) {
        const { error: logsError } = await supabase
          .from('build_logs')
          .insert(allLogs)

        if (logsError) {
          // Log but don't fail - build logs are secondary
          console.error('Error saving build logs:', logsError)
        } else {
          console.log(`[Messages] Saved ${allLogs.length} build logs`)
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
