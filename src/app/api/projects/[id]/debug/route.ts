import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Daytona } from '@daytona/sdk'

// Debug endpoint to check sandbox state
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
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!project.daytona_sandbox_id) {
      return NextResponse.json({
        error: 'No sandbox',
        project: { id: project.id, status: project.status }
      }, { status: 400 })
    }

    // Get sandbox info directly
    const client = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY,
      apiUrl: process.env.DAYTONA_API_URL || 'https://app.daytona.io/api',
    })

    const sandbox = await client.get(project.daytona_sandbox_id)
    const workDir = (await sandbox.getWorkDir()) || '/home/daytona'
    const appDir = `${workDir}/app`

    // Check various things
    const checks: Record<string, unknown> = {
      sandboxId: sandbox.id,
      sandboxState: sandbox.state,
      workDir,
      appDir,
    }

    // Check if app directory exists
    const lsResult = await sandbox.process.executeCommand(`ls -la ${appDir} 2>&1 | head -20`, workDir)
    checks.appDirContents = lsResult.result

    // Check if node_modules exists
    const nodeModules = await sandbox.process.executeCommand(`test -d ${appDir}/node_modules && echo "exists" || echo "missing"`, appDir)
    checks.nodeModules = nodeModules.result?.trim()

    // Check package.json scripts
    const packageJson = await sandbox.process.executeCommand(`cat ${appDir}/package.json 2>&1 | head -30`, appDir)
    checks.packageJson = packageJson.result

    // Check running processes
    const processes = await sandbox.process.executeCommand('ps aux | grep -E "node|npm|vite" | grep -v grep', appDir)
    checks.runningProcesses = processes.result || 'none'

    // Check what's listening on ports
    const ports = await sandbox.process.executeCommand('netstat -tlnp 2>/dev/null || ss -tlnp 2>/dev/null || echo "netstat/ss not available"', appDir)
    checks.listeningPorts = ports.result

    // Try to curl localhost on different ports
    for (const port of [3000, 5173, 4321, 8080]) {
      const curlResult = await sandbox.process.executeCommand(
        `curl -s -o /dev/null -w "%{http_code}" http://localhost:${port} 2>/dev/null || echo "failed"`,
        appDir
      )
      checks[`port${port}`] = curlResult.result?.trim()
    }

    // Check dev server logs
    const devLogs = await sandbox.process.executeCommand('cat /tmp/dev-server.log 2>&1 | tail -50', appDir)
    checks.devServerLogs = devLogs.result

    // Try to get preview URLs for different ports
    const previewUrls: Record<string, string> = {}
    for (const port of [3000, 5173, 4321]) {
      try {
        const preview = await sandbox.getSignedPreviewUrl(port, 3600)
        previewUrls[`port${port}`] = preview.url || 'empty'
      } catch (e) {
        previewUrls[`port${port}`] = `error: ${e instanceof Error ? e.message : String(e)}`
      }
    }
    checks.previewUrls = previewUrls

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        status: project.status,
        preview_url: project.preview_url,
      },
      checks,
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      {
        error: 'Debug failed',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
