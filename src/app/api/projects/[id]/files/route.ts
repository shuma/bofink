import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as daytona from '@/lib/daytona/client'
import type { FileNode } from '@/types/pluto'

const MAX_DEPTH = 10
const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  '.turbo',
  '.cache',
])

// Build file tree recursively
async function buildFileTree(
  sandboxId: string,
  path: string,
  depth: number = 0
): Promise<FileNode[]> {
  if (depth >= MAX_DEPTH) return []

  try {
    const entries = await daytona.listFiles(sandboxId, path)
    const nodes: FileNode[] = []

    for (const entry of entries) {
      // Skip hidden files at root level and excluded directories
      if (entry.name.startsWith('.') && depth === 0) continue
      if (entry.isDir && EXCLUDED_DIRS.has(entry.name)) continue

      const fullPath = `${path}/${entry.name}`.replace(/\/+/g, '/')
      const node: FileNode = {
        name: entry.name,
        path: fullPath,
        isDir: entry.isDir,
      }

      // Recursively build children for directories
      if (entry.isDir) {
        node.children = await buildFileTree(sandboxId, fullPath, depth + 1)
      }

      nodes.push(node)
    }

    // Sort: directories first, then alphabetically
    nodes.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    return nodes
  } catch (error) {
    console.error(`Failed to list files at ${path}:`, error)
    return []
  }
}

// GET ?action=tree - Returns recursive file tree
// GET ?action=content&path=/path/to/file - Returns file content
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'tree'
  const filePath = searchParams.get('path')

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

    const sandboxId = project.daytona_sandbox_id

    // Ensure sandbox is running
    await daytona.ensureSandboxRunning(sandboxId)

    if (action === 'tree') {
      // Get workspace root
      const workDir = await daytona.getWorkDir(sandboxId)
      const appDir = `${workDir}/app`

      const tree = await buildFileTree(sandboxId, appDir)
      return NextResponse.json({ tree, root: appDir })
    }

    if (action === 'content') {
      if (!filePath) {
        return NextResponse.json(
          { error: 'File path required' },
          { status: 400 }
        )
      }

      const content = await daytona.readFile(sandboxId, filePath)
      return NextResponse.json({ content, path: filePath })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[Files API] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to get files: ${message}` },
      { status: 500 }
    )
  }
}
