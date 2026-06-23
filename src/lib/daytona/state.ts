/**
 * Sandbox State Tracking
 *
 * Persists sandbox state to the sandbox filesystem for:
 * - Smart restart decisions
 * - Activity tracking
 * - File modification history
 * - Checkpoint management
 */

import { Daytona, Sandbox } from '@daytona/sdk'

// State file location in sandbox
const STATE_FILE = '/.pluto/state.json'

// Singleton client
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

// Cache
interface CachedSandbox {
  sandbox: Sandbox
  cachedAt: number
}

const CACHE_TTL_MS = 30_000
const sandboxCache = new Map<string, CachedSandbox>()

async function getSandbox(sandboxId: string): Promise<Sandbox> {
  const cached = sandboxCache.get(sandboxId)
  const now = Date.now()

  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    return cached.sandbox
  }

  const client = getClient()
  const sandbox = await client.get(sandboxId)
  sandboxCache.set(sandboxId, { sandbox, cachedAt: now })
  return sandbox
}

// ============================================================================
// State Interface
// ============================================================================

export interface SandboxState {
  id: string
  projectId: string | null
  templateVersion: string
  devServerRunning: boolean
  devServerPort: number
  lastActivity: string // ISO timestamp
  createdAt: string // ISO timestamp
  filesModified: FileModification[]
  checkpoints: string[] // Checkpoint labels
  buildCount: number
  lastBuildAt: string | null
  errorCount: number
  lastError: string | null
}

export interface FileModification {
  path: string
  type: 'created' | 'modified' | 'deleted'
  timestamp: string
}

// Default state factory
function createDefaultState(
  sandboxId: string,
  projectId?: string
): SandboxState {
  const now = new Date().toISOString()
  return {
    id: sandboxId,
    projectId: projectId || null,
    templateVersion: process.env.SANDBOX_TEMPLATE_VERSION || 'v1.0.0',
    devServerRunning: false,
    devServerPort: 3000,
    lastActivity: now,
    createdAt: now,
    filesModified: [],
    checkpoints: [],
    buildCount: 0,
    lastBuildAt: null,
    errorCount: 0,
    lastError: null,
  }
}

// ============================================================================
// State Operations
// ============================================================================

/**
 * Load state from sandbox filesystem
 */
export async function loadState(sandboxId: string): Promise<SandboxState | null> {
  const sandbox = await getSandbox(sandboxId)

  try {
    const buffer = await sandbox.fs.downloadFile(STATE_FILE)
    const state = JSON.parse(buffer.toString('utf-8'))
    return state as SandboxState
  } catch {
    // State file doesn't exist yet
    return null
  }
}

/**
 * Save state to sandbox filesystem
 */
export async function saveState(
  sandboxId: string,
  state: SandboxState
): Promise<void> {
  const sandbox = await getSandbox(sandboxId)

  // Ensure .pluto directory exists
  await sandbox.process.executeCommand('mkdir -p /.pluto', '/')

  // Write state file
  const content = JSON.stringify(state, null, 2)
  await sandbox.fs.uploadFile(Buffer.from(content, 'utf-8'), STATE_FILE)
}

/**
 * Get or initialize state
 */
export async function getOrCreateState(
  sandboxId: string,
  projectId?: string
): Promise<SandboxState> {
  let state = await loadState(sandboxId)

  if (!state) {
    state = createDefaultState(sandboxId, projectId)
    await saveState(sandboxId, state)
  }

  return state
}

/**
 * Update specific state fields
 */
export async function updateState(
  sandboxId: string,
  updates: Partial<SandboxState>
): Promise<SandboxState> {
  let state = await loadState(sandboxId)

  if (!state) {
    state = createDefaultState(sandboxId)
  }

  // Merge updates
  const newState: SandboxState = {
    ...state,
    ...updates,
    lastActivity: new Date().toISOString(),
  }

  await saveState(sandboxId, newState)
  return newState
}

// ============================================================================
// Activity Tracking
// ============================================================================

/**
 * Record sandbox activity (extends auto-stop timeout)
 */
export async function recordActivity(sandboxId: string): Promise<void> {
  const sandbox = await getSandbox(sandboxId)

  // Refresh Daytona activity timer
  await sandbox.refreshActivity()

  // Update state
  await updateState(sandboxId, {
    lastActivity: new Date().toISOString(),
  })
}

/**
 * Record a file modification
 */
export async function recordFileModification(
  sandboxId: string,
  path: string,
  type: 'created' | 'modified' | 'deleted'
): Promise<void> {
  const state = await loadState(sandboxId)
  if (!state) return

  const modification: FileModification = {
    path,
    type,
    timestamp: new Date().toISOString(),
  }

  // Keep only last 100 modifications
  const filesModified = [...state.filesModified, modification].slice(-100)

  await updateState(sandboxId, { filesModified })
}

/**
 * Record dev server state
 */
export async function recordDevServerState(
  sandboxId: string,
  running: boolean,
  port?: number
): Promise<void> {
  await updateState(sandboxId, {
    devServerRunning: running,
    devServerPort: port ?? 3000,
  })
}

/**
 * Record a build
 */
export async function recordBuild(
  sandboxId: string,
  success: boolean,
  error?: string
): Promise<void> {
  const state = await loadState(sandboxId)
  if (!state) return

  await updateState(sandboxId, {
    buildCount: state.buildCount + 1,
    lastBuildAt: new Date().toISOString(),
    errorCount: success ? state.errorCount : state.errorCount + 1,
    lastError: success ? null : error ?? 'Unknown error',
  })
}

/**
 * Record a checkpoint
 */
export async function recordCheckpoint(
  sandboxId: string,
  label: string
): Promise<void> {
  const state = await loadState(sandboxId)
  if (!state) return

  // Keep only last 10 checkpoints
  const checkpoints = [...state.checkpoints.filter((l) => l !== label), label].slice(-10)

  await updateState(sandboxId, { checkpoints })
}

// ============================================================================
// State Queries
// ============================================================================

/**
 * Check if sandbox has been idle too long
 */
export async function isIdle(
  sandboxId: string,
  maxIdleMinutes: number = 30
): Promise<boolean> {
  const state = await loadState(sandboxId)
  if (!state) return true

  const lastActivity = new Date(state.lastActivity).getTime()
  const now = Date.now()
  const idleMinutes = (now - lastActivity) / (1000 * 60)

  return idleMinutes > maxIdleMinutes
}

/**
 * Get sandbox health status
 */
export interface SandboxHealth {
  isHealthy: boolean
  devServerRunning: boolean
  recentErrors: number
  lastActivity: Date
  idleMinutes: number
}

export async function getHealth(sandboxId: string): Promise<SandboxHealth> {
  const state = await loadState(sandboxId)

  if (!state) {
    return {
      isHealthy: false,
      devServerRunning: false,
      recentErrors: 0,
      lastActivity: new Date(),
      idleMinutes: 0,
    }
  }

  const lastActivity = new Date(state.lastActivity)
  const idleMinutes = (Date.now() - lastActivity.getTime()) / (1000 * 60)

  return {
    isHealthy: state.devServerRunning && state.errorCount < 5 && idleMinutes < 60,
    devServerRunning: state.devServerRunning,
    recentErrors: state.errorCount,
    lastActivity,
    idleMinutes,
  }
}

/**
 * Get recently modified files
 */
export async function getRecentlyModifiedFiles(
  sandboxId: string,
  minutes: number = 10
): Promise<FileModification[]> {
  const state = await loadState(sandboxId)
  if (!state) return []

  const cutoff = Date.now() - minutes * 60 * 1000
  return state.filesModified.filter(
    (m) => new Date(m.timestamp).getTime() > cutoff
  )
}

/**
 * Clear state (for reset/cleanup)
 */
export async function clearState(sandboxId: string): Promise<void> {
  const sandbox = await getSandbox(sandboxId)

  try {
    await sandbox.process.executeCommand('rm -rf /.pluto', '/')
  } catch {
    // Ignore errors
  }
}
