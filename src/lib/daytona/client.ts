import { Daytona, Sandbox, DaytonaError } from '@daytona/sdk'
import { createAdminClient } from '@/lib/supabase/admin'

// Singleton Daytona client
let daytonaClient: Daytona | null = null

// Managed session id used to run the long-lived dev server. Using a session
// keeps the process alive independently of one-shot `executeCommand` calls.
const DEV_SESSION_ID = 'pluto-dev'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getClient(): Daytona {
  if (!daytonaClient) {
    daytonaClient = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY,
      apiUrl: process.env.DAYTONA_API_URL || 'https://app.daytona.io/api',
    })
  }
  return daytonaClient
}

// Cache for sandbox instances with TTL
interface CachedSandbox {
  sandbox: Sandbox
  cachedAt: number
}

const CACHE_TTL_MS = 30_000 // 30 seconds
const sandboxCache = new Map<string, CachedSandbox>()

async function getSandbox(sandboxId: string, forceRefresh = false): Promise<Sandbox> {
  const cached = sandboxCache.get(sandboxId)
  const now = Date.now()

  // Return cached sandbox if valid and not forcing refresh
  if (cached && !forceRefresh && now - cached.cachedAt < CACHE_TTL_MS) {
    return cached.sandbox
  }

  const client = getClient()
  const sandbox = await client.get(sandboxId)
  sandboxCache.set(sandboxId, { sandbox, cachedAt: now })
  return sandbox
}

function setCachedSandbox(sandboxId: string, sandbox: Sandbox): void {
  sandboxCache.set(sandboxId, { sandbox, cachedAt: Date.now() })
}

export interface CreateSandboxResult {
  id: string
  state: string
  workDir: string
}

function isDiskLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /disk limit exceeded/i.test(message)
}

// Don't delete sandboxes younger than this — a concurrent build may have just
// created one and not yet persisted its id to the projects row.
const ORPHAN_GRACE_MS = 10 * 60_000 // 10 minutes

// Load the set of sandbox ids still referenced by a project. Returns null if the
// lookup fails, in which case callers must NOT treat any sandbox as orphaned
// (deleting everything would destroy live projects).
async function getReferencedSandboxIds(): Promise<Set<string> | null> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('projects')
      .select('daytona_sandbox_id')
      .not('daytona_sandbox_id', 'is', null)

    if (error) {
      console.warn('[Daytona] Failed to load referenced sandbox ids:', error.message)
      return null
    }

    return new Set(
      (data ?? [])
        .map((row) => row.daytona_sandbox_id as string | null)
        .filter((id): id is string => Boolean(id))
    )
  } catch (err) {
    console.warn('[Daytona] Failed to query projects for cleanup:', err)
    return null
  }
}

// Reclaim disk quota by:
//  - deleting orphaned sandboxes (no matching project in Supabase), and
//  - archiving stopped sandboxes that are still referenced (frees disk, keeps
//    them restartable).
async function reclaimDisk(client: Daytona): Promise<{ deleted: number; archived: number }> {
  let deleted = 0
  let archived = 0

  const referenced = await getReferencedSandboxIds()
  const cutoff = Date.now() - ORPHAN_GRACE_MS

  try {
    for await (const sandbox of client.list()) {
      const createdMs = sandbox.createdAt ? Date.parse(sandbox.createdAt) : NaN
      const tooNew = Number.isFinite(createdMs) && createdMs > cutoff
      const isOrphan = referenced !== null && !referenced.has(sandbox.id) && !tooNew

      try {
        if (isOrphan) {
          await sandbox.delete()
          sandboxCache.delete(sandbox.id)
          deleted++
          console.log(`[Daytona] Deleted orphaned sandbox ${sandbox.id}`)
        } else if (sandbox.state === 'stopped') {
          await sandbox.archive()
          sandboxCache.delete(sandbox.id)
          archived++
          console.log(`[Daytona] Archived stopped sandbox ${sandbox.id}`)
        }
      } catch (err) {
        // 404 (already gone) and 409 (state change in progress) are expected when
        // concurrent builds clean up the same sandboxes — treat them as benign.
        const status = (err as { statusCode?: number })?.statusCode
        if (status === 404 || status === 409) {
          console.log(`[Daytona] Skipped sandbox ${sandbox.id} during cleanup (${status})`)
        } else {
          console.warn(`[Daytona] Failed to clean up sandbox ${sandbox.id}:`, err)
        }
      }
    }
  } catch (err) {
    console.warn('[Daytona] Failed to list sandboxes for cleanup:', err)
  }

  return { deleted, archived }
}

export async function createSandbox(): Promise<CreateSandboxResult> {
  const client = getClient()

  const create = () =>
    client.create({
      language: 'typescript',
      envVars: { NODE_ENV: 'development' },
      public: true, // Make sandbox public to skip preview warning page
    })

  let sandbox: Sandbox
  try {
    sandbox = await create()
  } catch (error) {
    // Disk quota exceeded: reclaim space by deleting orphaned sandboxes and
    // archiving idle ones, then retry once.
    if (isDiskLimitError(error)) {
      console.warn('[Daytona] Disk limit exceeded, reclaiming disk space...')
      const { deleted, archived } = await reclaimDisk(client)
      console.log(
        `[Daytona] Deleted ${deleted} orphaned and archived ${archived} sandbox(es), retrying create`
      )
      sandbox = await create()
    } else {
      throw error
    }
  }

  // Set auto-stop interval to 60 minutes for active development
  await sandbox.setAutostopInterval(60)
  // Auto-archive after the sandbox has been stopped for 60 minutes so idle
  // sandboxes release their disk quota instead of accumulating.
  await sandbox.setAutoArchiveInterval(60)

  setCachedSandbox(sandbox.id, sandbox)

  // Get the working directory
  const workDir = (await sandbox.getWorkDir()) || '/home/daytona'

  return {
    id: sandbox.id,
    state: sandbox.state || 'running',
    workDir,
  }
}

export async function getWorkDir(sandboxId: string): Promise<string> {
  const sandbox = await getSandbox(sandboxId)
  return (await sandbox.getWorkDir()) || '/home/daytona'
}

// Start the vite dev server inside a managed Daytona session. Sessions keep the
// process alive after the call returns (unlike one-shot executeCommand), which
// is what previously caused the server to be reaped and the proxy to 502.
async function startDevServerSession(sandbox: Sandbox, appDir: string): Promise<void> {
  // Best-effort cleanup of any previous session (ignore "not found").
  try {
    await sandbox.process.deleteSession(DEV_SESSION_ID)
  } catch {
    // Session may not exist yet — that's fine.
  }

  await sandbox.process.createSession(DEV_SESSION_ID)
  await sandbox.process.executeSessionCommand(DEV_SESSION_ID, {
    command: `cd ${appDir} && npx vite dev --host 0.0.0.0 --port 3000 > /tmp/dev-server.log 2>&1`,
    runAsync: true,
  })
}

export async function ensureSandboxRunning(sandboxId: string): Promise<void> {
  // Force refresh to get current sandbox state
  let sandbox = await getSandbox(sandboxId, true)

  // Start the sandbox first if needed. getWorkDir / process calls resolve the
  // container IP, which only exists once the sandbox is started — calling them
  // on a stopped/archived sandbox fails with "failed to resolve container IP".
  if (sandbox.state !== 'started') {
    console.log(`[Daytona] Sandbox ${sandboxId} is ${sandbox.state}, starting...`)

    // Retry logic for 409 Conflict (state change in progress)
    const maxRetries = 5
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await sandbox.start()
        break
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode
        if (statusCode === 409 && attempt < maxRetries - 1) {
          // Another request is starting the sandbox, wait and check state
          console.log(`[Daytona] Sandbox state change in progress, waiting... (attempt ${attempt + 1}/${maxRetries})`)
          await sleep(2000)
          sandbox = await getSandbox(sandboxId, true)
          if (sandbox.state === 'started') {
            console.log('[Daytona] Sandbox was started by another request')
            break
          }
          continue
        }
        throw err
      }
    }

    // Wait for sandbox to be ready
    await sandbox.waitUntilStarted()
    console.log('[Daytona] Sandbox started')
  }

  // Get working directory (safe now that the container is running)
  const workDir = (await sandbox.getWorkDir()) || '/home/daytona'
  const appDir = `${workDir}/app`

  console.log(`[Daytona] Ensuring sandbox ${sandboxId} is running, appDir: ${appDir}`)

  // Extend auto-stop interval for active use
  await sandbox.setAutostopInterval(60)

  // Refresh activity to reset inactivity timer
  await sandbox.refreshActivity()

  // First, check if server is already responding (this is the actual health check)
  console.log('[Daytona] Checking if dev server is responding...')
  const healthCheck = await sandbox.process.executeCommand(
    'curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000"',
    appDir
  )

  const statusCode = healthCheck.result?.trim() || '000'
  console.log(`[Daytona] Health check status: ${statusCode}`)

  // Only treat the server as ready when it returns a 2xx/3xx code. Accepting any
  // non-000 status (including 5xx) previously returned "ready" while vite/SSR was
  // still erroring, which surfaced as 502/500 at the proxy.
  if (/^[23]\d\d$/.test(statusCode)) {
    console.log('[Daytona] Dev server is already running and responding')
    return
  }

  // Server not responding (or erroring) - need to (re)start it
  console.log('[Daytona] Dev server not responding, starting it...')

  // Check if node_modules exists, install if not
  const nodeModulesCheck = await sandbox.process.executeCommand(
    'test -d node_modules && echo "exists" || echo "missing"',
    appDir
  )

  if (nodeModulesCheck.result?.trim() === 'missing') {
    console.log('[Daytona] Installing dependencies (this may take a while)...')
    const installResult = await sandbox.process.executeCommand(
      'npm install --legacy-peer-deps 2>&1',
      appDir,
      undefined,
      600 // 10 minute timeout for npm install
    )
    console.log(`[Daytona] Install exit code: ${installResult.exitCode}`)
    console.log(`[Daytona] Install output (last 500 chars): ${installResult.result?.slice(-500) || '(empty)'}`)

    if (installResult.exitCode !== 0) {
      console.error('[Daytona] npm install failed')
      throw new Error(`npm install failed: ${installResult.result?.slice(-200)}`)
    }
  }

  // Start dev server inside a managed session so it survives this call.
  console.log('[Daytona] Starting vite dev server (managed session)...')
  await startDevServerSession(sandbox, appDir)

  // Wait for server to start and check if it's ready
  console.log('[Daytona] Waiting for dev server to respond...')
  for (let i = 0; i < 15; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Refresh activity during long wait
    if (i % 3 === 0) {
      await sandbox.refreshActivity()
    }

    // Check if server is responding
    const curlResult = await sandbox.process.executeCommand(
      'curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000"',
      appDir
    )

    const code = curlResult.result?.trim() || '000'
    console.log(`[Daytona] Attempt ${i + 1}/15: status ${code}`)

    // Require a 2xx/3xx response before declaring readiness.
    if (/^[23]\d\d$/.test(code)) {
      console.log('[Daytona] Dev server is ready!')
      return
    }
  }

  // Check logs if server didn't start
  const logs = await sandbox.process.executeCommand('cat /tmp/dev-server.log 2>/dev/null | tail -30', appDir)
  console.error('[Daytona] Dev server failed to start. Logs:', logs.result)
  throw new Error(`Dev server failed to start. Check logs: ${logs.result?.substring(0, 500) || 'No logs available'}`)
}

export async function deleteSandbox(sandboxId: string): Promise<void> {
  try {
    const sandbox = await getSandbox(sandboxId)
    await sandbox.delete()
  } catch (error) {
    if (error instanceof DaytonaError) {
      console.error(`Daytona error deleting sandbox ${sandboxId}:`, error.message)
    }
    throw error
  } finally {
    sandboxCache.delete(sandboxId)
  }
}

export async function runCommand(
  sandboxId: string,
  command: string,
  cwd?: string,
  timeoutSeconds?: number
): Promise<{ exitCode: number; output: string }> {
  const sandbox = await getSandbox(sandboxId)
  const result = await sandbox.process.executeCommand(
    command,
    cwd || '/app',
    undefined,
    timeoutSeconds
  )

  return {
    exitCode: result.exitCode ?? 0,
    output: result.result || '',
  }
}

// Re-export DaytonaError for external error handling
export { DaytonaError }

export async function writeFile(
  sandboxId: string,
  path: string,
  content: string
): Promise<void> {
  const sandbox = await getSandbox(sandboxId)
  await sandbox.fs.uploadFile(Buffer.from(content, 'utf-8'), path)
}

export async function readFile(
  sandboxId: string,
  path: string
): Promise<string> {
  const sandbox = await getSandbox(sandboxId)
  const buffer = await sandbox.fs.downloadFile(path)
  return buffer.toString('utf-8')
}

export async function listFiles(
  sandboxId: string,
  path: string
): Promise<{ name: string; isDir: boolean }[]> {
  const sandbox = await getSandbox(sandboxId)
  const entries = await sandbox.fs.listFiles(path)
  return entries.map((entry) => ({
    name: entry.name || '',
    isDir: entry.isDir || false,
  }))
}

export async function getPreviewUrl(
  sandboxId: string,
  port: number = 3000
): Promise<string> {
  // Always get fresh sandbox to ensure valid preview URL
  const sandbox = await getSandbox(sandboxId, true)

  console.log(`[Daytona] Generating signed preview URL for sandbox ${sandboxId}, port ${port}`)
  console.log(`[Daytona] Sandbox state: ${sandbox.state}`)

  // Use signed preview URL for iframe embedding (no headers required)
  // Expires in 1 hour (3600 seconds)
  const signedPreview = await sandbox.getSignedPreviewUrl(port, 3600)

  console.log(`[Daytona] Signed preview result:`, JSON.stringify(signedPreview, null, 2))

  // The signed URL embeds its signature and is designed to bypass Daytona's
  // "Preview URL Warning" interstitial. Appending `?token=...` re-triggers that
  // warning, so we return the signed URL exactly as Daytona produced it.
  if (signedPreview.url) {
    return signedPreview.url
  }

  // Fallback: the sandbox is created with `public: true`, so the public preview
  // link needs no token and shows no warning page.
  console.warn('[Daytona] No signed preview URL, falling back to public preview link')
  const publicPreview = await sandbox.getPreviewLink(port)
  return publicPreview.url || ''
}

// Probe the proxy preview URL server-side until it responds with a non-5xx
// status. This absorbs proxy-registration lag so the iframe only ever loads a
// working URL. Returns true on success, false if all attempts are exhausted.
export async function waitForPreviewReady(
  url: string,
  attempts = 12,
  delayMs = 1500
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { method: 'GET', redirect: 'manual' })
      if (res.status < 500) {
        return true
      }
    } catch {
      // Network error (proxy not registered yet) — keep polling.
    }
    await sleep(delayMs)
  }
  return false
}

export async function gitClone(
  sandboxId: string,
  repoUrl: string,
  targetPath: string = '/app'
): Promise<void> {
  const sandbox = await getSandbox(sandboxId)
  await sandbox.git.clone(repoUrl, targetPath)
}
