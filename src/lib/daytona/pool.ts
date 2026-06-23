/**
 * Sandbox Pool Manager
 *
 * Manages a pool of pre-warmed Daytona sandboxes for faster cold starts.
 * Instead of creating a new sandbox + scaffolding + installing deps on each build,
 * we maintain a pool of ready-to-use sandboxes.
 */

import { Daytona } from '@daytona/sdk'
import { createAdminClient } from '@/lib/supabase/admin'
import { templateFiles } from '@/lib/pluto/template'

// Pool configuration
export interface PoolConfig {
  targetSize: number // Target number of ready sandboxes (default: 3)
  minReady: number // Minimum ready sandboxes before triggering warmup (default: 1)
  maxAge: number // Max age in minutes for ready sandboxes (default: 30)
  warmupTimeout: number // Timeout for sandbox warmup in minutes (default: 10)
  templateVersion: string // Version identifier for template compatibility
}

// Default pool configuration
const DEFAULT_CONFIG: PoolConfig = {
  targetSize: 3,
  minReady: 1,
  maxAge: 30,
  warmupTimeout: 10,
  templateVersion: 'v1.0.0',
}

// Pool statistics
export interface PoolStats {
  totalCount: number
  warmingCount: number
  readyCount: number
  assignedCount: number
  expiredCount: number
  oldestReadyAt: Date | null
  newestReadyAt: Date | null
  hitRate: number // Percentage of acquires that found a ready sandbox
}

// Singleton Daytona client
let daytonaClient: Daytona | null = null

function getClient(): Daytona {
  if (!daytonaClient) {
    daytonaClient = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY,
      apiUrl: process.env.DAYTONA_API_URL || 'https://app.daytona.io/api',
    })
  }
  return daytonaClient
}

/**
 * Get current pool configuration (can be extended to read from env/db)
 */
export function getPoolConfig(): PoolConfig {
  return {
    ...DEFAULT_CONFIG,
    targetSize: parseInt(process.env.SANDBOX_POOL_SIZE || '3', 10),
    maxAge: parseInt(process.env.SANDBOX_POOL_MAX_AGE || '30', 10),
    templateVersion: process.env.SANDBOX_TEMPLATE_VERSION || 'v1.0.0',
  }
}

/**
 * Create and warm a new sandbox (scaffold template + install dependencies)
 * Returns the sandbox ID when ready.
 */
export async function warmSandbox(): Promise<string> {
  const client = getClient()
  const config = getPoolConfig()
  const supabase = createAdminClient()

  console.log('[Pool] Creating new sandbox for warming...')

  // Create sandbox
  const sandbox = await client.create({
    language: 'typescript',
    envVars: { NODE_ENV: 'development' },
    public: true,
  })

  const sandboxId = sandbox.id
  console.log(`[Pool] Created sandbox ${sandboxId}`)

  // Insert into pool as 'warming'
  const { error: insertError } = await supabase.from('sandbox_pool').insert({
    sandbox_id: sandboxId,
    state: 'warming',
    template_version: config.templateVersion,
    expires_at: new Date(Date.now() + config.maxAge * 60 * 1000).toISOString(),
  })

  if (insertError) {
    console.error(`[Pool] Failed to insert sandbox ${sandboxId} into pool:`, insertError)
    // Clean up the sandbox since we can't track it
    try {
      await sandbox.delete()
    } catch {
      // Ignore cleanup errors
    }
    throw new Error(`Failed to insert sandbox into pool: ${insertError.message}`)
  }

  try {
    // Set auto-stop interval
    await sandbox.setAutostopInterval(60)
    await sandbox.setAutoArchiveInterval(60)

    // Get working directory
    const workDir = (await sandbox.getWorkDir()) || '/home/daytona'
    const appDir = `${workDir}/app`

    console.log(`[Pool] Scaffolding template in ${appDir}...`)

    // Create app directory
    await sandbox.fs.uploadFile(Buffer.from(''), `${appDir}/.keep`)

    // Scaffold all template files
    for (const [filePath, content] of Object.entries(templateFiles)) {
      if (!content) continue // Skip empty files like favicon placeholder
      const fullPath = `${appDir}/${filePath}`

      // Create parent directories if needed
      const parentDir = fullPath.substring(0, fullPath.lastIndexOf('/'))
      if (parentDir !== appDir) {
        await sandbox.fs.uploadFile(Buffer.from(''), `${parentDir}/.keep`)
      }

      await sandbox.fs.uploadFile(Buffer.from(content, 'utf-8'), fullPath)
    }

    console.log(`[Pool] Installing dependencies in ${appDir}...`)

    // Install dependencies using bun (faster than npm)
    const installResult = await sandbox.process.executeCommand(
      'bun install 2>&1',
      appDir,
      undefined,
      300 // 5 minute timeout
    )

    if (installResult.exitCode !== 0) {
      console.error(`[Pool] Dependency install failed for ${sandboxId}:`, installResult.result?.slice(-500))
      throw new Error(`Dependency install failed: ${installResult.result?.slice(-200)}`)
    }

    console.log(`[Pool] Dependencies installed for ${sandboxId}`)

    // Mark as ready in the pool
    const { error: updateError } = await supabase
      .from('sandbox_pool')
      .update({
        state: 'ready',
        ready_at: new Date().toISOString(),
      })
      .eq('sandbox_id', sandboxId)

    if (updateError) {
      console.error(`[Pool] Failed to mark sandbox ${sandboxId} as ready:`, updateError)
      throw new Error(`Failed to mark sandbox as ready: ${updateError.message}`)
    }

    console.log(`[Pool] Sandbox ${sandboxId} is now ready`)
    return sandboxId
  } catch (error) {
    // Mark as expired on failure
    await supabase.from('sandbox_pool').update({ state: 'expired' }).eq('sandbox_id', sandboxId)

    // Try to clean up the sandbox
    try {
      await sandbox.delete()
    } catch {
      // Ignore cleanup errors
    }

    throw error
  }
}

/**
 * Acquire a ready sandbox from the pool for a project.
 * If no sandbox is available, creates a new one (cold start fallback).
 *
 * Returns the sandbox ID and working directory.
 */
export async function acquireSandbox(
  projectId: string
): Promise<{ sandboxId: string; workDir: string; wasPreWarmed: boolean }> {
  const config = getPoolConfig()
  const supabase = createAdminClient()

  console.log(`[Pool] Acquiring sandbox for project ${projectId}...`)

  // Try to acquire a ready sandbox using the atomic database function
  const { data: acquireResult, error: acquireError } = await supabase.rpc('acquire_sandbox', {
    p_project_id: projectId,
    p_template_version: config.templateVersion,
  })

  if (acquireError) {
    console.error('[Pool] Failed to acquire sandbox from pool:', acquireError)
  }

  const acquired = acquireResult?.[0]
  if (acquired?.was_acquired && acquired?.sandbox_id) {
    const sandboxId = acquired.sandbox_id
    console.log(`[Pool] Acquired pre-warmed sandbox ${sandboxId}`)

    // Get sandbox and working directory
    const client = getClient()
    const sandbox = await client.get(sandboxId)

    // Ensure sandbox is started
    if (sandbox.state !== 'started') {
      console.log(`[Pool] Starting sandbox ${sandboxId}...`)
      await sandbox.start()
      await sandbox.waitUntilStarted()
    }

    const workDir = (await sandbox.getWorkDir()) || '/home/daytona'

    // Refresh activity and extend auto-stop
    await sandbox.setAutostopInterval(120) // 2 hours for active development
    await sandbox.refreshActivity()

    return {
      sandboxId,
      workDir,
      wasPreWarmed: true,
    }
  }

  // No ready sandbox available - cold start fallback
  console.log('[Pool] No ready sandbox available, creating new one (cold start)...')

  const client = getClient()
  const sandbox = await client.create({
    language: 'typescript',
    envVars: { NODE_ENV: 'development' },
    public: true,
  })

  await sandbox.setAutostopInterval(120)
  await sandbox.setAutoArchiveInterval(60)

  const workDir = (await sandbox.getWorkDir()) || '/home/daytona'

  // Insert into pool as assigned (tracking even cold-start sandboxes)
  await supabase.from('sandbox_pool').insert({
    sandbox_id: sandbox.id,
    state: 'assigned',
    template_version: config.templateVersion,
    assigned_to_project: projectId,
    assigned_at: new Date().toISOString(),
  })

  return {
    sandboxId: sandbox.id,
    workDir,
    wasPreWarmed: false,
  }
}

/**
 * Release a sandbox back to the pool or mark it as expired.
 *
 * @param sandboxId - The sandbox to release
 * @param markExpired - If true, mark as expired (sandbox will be deleted). If false, return to pool for reuse.
 */
export async function releaseSandbox(sandboxId: string, markExpired = false): Promise<boolean> {
  const supabase = createAdminClient()

  console.log(`[Pool] Releasing sandbox ${sandboxId} (markExpired: ${markExpired})`)

  const { data, error } = await supabase.rpc('release_sandbox', {
    p_sandbox_id: sandboxId,
    p_mark_expired: markExpired,
  })

  if (error) {
    console.error(`[Pool] Failed to release sandbox ${sandboxId}:`, error)
    return false
  }

  return data === true
}

/**
 * Maintain the pool - warm new sandboxes, clean up expired ones.
 * Should be called periodically (e.g., every 5 minutes via cron).
 */
export async function maintainPool(): Promise<{
  warmed: number
  cleaned: number
  deleted: string[]
}> {
  const config = getPoolConfig()
  const supabase = createAdminClient()
  const client = getClient()

  console.log('[Pool] Running maintenance...')

  let warmed = 0
  let cleaned = 0
  const deleted: string[] = []

  // 1. Clean up expired/stale sandboxes
  const { data: cleanupResult, error: cleanupError } = await supabase.rpc('cleanup_sandbox_pool', {
    p_max_age_minutes: config.maxAge,
  })

  if (cleanupError) {
    console.error('[Pool] Cleanup failed:', cleanupError)
  } else if (cleanupResult?.[0]) {
    cleaned = cleanupResult[0].cleaned_count || 0
    const expiredIds = cleanupResult[0].sandbox_ids || []

    // Actually delete the expired sandboxes from Daytona
    for (const sandboxId of expiredIds) {
      try {
        const sandbox = await client.get(sandboxId)
        await sandbox.delete()
        deleted.push(sandboxId)
        console.log(`[Pool] Deleted expired sandbox ${sandboxId}`)
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode
        if (status === 404) {
          // Already gone, just remove from pool
          deleted.push(sandboxId)
        } else {
          console.warn(`[Pool] Failed to delete sandbox ${sandboxId}:`, err)
        }
      }
    }

    // Remove deleted sandboxes from the pool table
    if (deleted.length > 0) {
      await supabase.from('sandbox_pool').delete().in('sandbox_id', deleted)
    }
  }

  // 2. Check current pool stats and warm new sandboxes if needed
  const stats = await getPoolStats()

  const needToWarm = config.targetSize - stats.readyCount - stats.warmingCount
  if (needToWarm > 0) {
    console.log(`[Pool] Need to warm ${needToWarm} sandboxes (ready: ${stats.readyCount}, warming: ${stats.warmingCount}, target: ${config.targetSize})`)

    // Warm sandboxes in parallel (but limit concurrency)
    const warmPromises: Promise<void>[] = []
    for (let i = 0; i < Math.min(needToWarm, 2); i++) {
      warmPromises.push(
        warmSandbox()
          .then(() => {
            warmed++
          })
          .catch((err) => {
            console.error('[Pool] Failed to warm sandbox:', err)
          })
      )
    }

    await Promise.all(warmPromises)
  }

  console.log(`[Pool] Maintenance complete: warmed ${warmed}, cleaned ${cleaned}, deleted ${deleted.length}`)

  return { warmed, cleaned, deleted }
}

/**
 * Get current pool statistics
 */
export async function getPoolStats(): Promise<PoolStats> {
  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc('get_sandbox_pool_stats')

  if (error) {
    console.error('[Pool] Failed to get pool stats:', error)
    return {
      totalCount: 0,
      warmingCount: 0,
      readyCount: 0,
      assignedCount: 0,
      expiredCount: 0,
      oldestReadyAt: null,
      newestReadyAt: null,
      hitRate: 0,
    }
  }

  const stats = data?.[0] || {}

  // Calculate hit rate from recent acquires (would need additional tracking)
  // For now, estimate based on ready vs assigned ratio
  const hitRate =
    stats.assigned_count > 0
      ? (stats.assigned_count / (stats.assigned_count + stats.expired_count)) * 100
      : 100

  return {
    totalCount: stats.total_count || 0,
    warmingCount: stats.warming_count || 0,
    readyCount: stats.ready_count || 0,
    assignedCount: stats.assigned_count || 0,
    expiredCount: stats.expired_count || 0,
    oldestReadyAt: stats.oldest_ready_at ? new Date(stats.oldest_ready_at) : null,
    newestReadyAt: stats.newest_ready_at ? new Date(stats.newest_ready_at) : null,
    hitRate,
  }
}

/**
 * Check if a sandbox was pre-warmed (has template and deps already installed)
 */
export async function isSandboxPreWarmed(sandboxId: string): Promise<boolean> {
  const client = getClient()

  try {
    const sandbox = await client.get(sandboxId)
    const workDir = (await sandbox.getWorkDir()) || '/home/daytona'
    const appDir = `${workDir}/app`

    // Check if node_modules exists
    const checkResult = await sandbox.process.executeCommand(
      'test -d node_modules && test -f package.json && echo "ready" || echo "not-ready"',
      appDir
    )

    return checkResult.result?.trim() === 'ready'
  } catch {
    return false
  }
}

/**
 * Clear the entire pool (for testing/reset purposes)
 */
export async function clearPool(): Promise<number> {
  const supabase = createAdminClient()
  const client = getClient()

  console.log('[Pool] Clearing entire pool...')

  // Get all sandboxes in the pool
  const { data: poolEntries, error } = await supabase
    .from('sandbox_pool')
    .select('sandbox_id')
    .neq('state', 'assigned') // Don't delete assigned sandboxes

  if (error) {
    console.error('[Pool] Failed to fetch pool entries:', error)
    return 0
  }

  let deleted = 0

  for (const entry of poolEntries || []) {
    try {
      const sandbox = await client.get(entry.sandbox_id)
      await sandbox.delete()
      deleted++
    } catch {
      // Sandbox may already be gone
    }
  }

  // Clear non-assigned entries from the table
  await supabase.from('sandbox_pool').delete().neq('state', 'assigned')

  console.log(`[Pool] Cleared ${deleted} sandboxes from pool`)
  return deleted
}
