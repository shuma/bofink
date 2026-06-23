/**
 * Enhanced Daytona Operations
 *
 * Provides advanced sandbox operations beyond basic file/command execution:
 * - Line-range file reading
 * - Patch-based file editing
 * - File search (glob patterns)
 * - Content search (grep)
 * - File tree navigation
 * - Process management
 * - Checkpoint management
 * - Output truncation
 */

import { Daytona, Sandbox } from '@daytona/sdk'

// Singleton Daytona client
let daytonaClient: Daytona | null = null

// Sandbox cache with TTL
interface CachedSandbox {
  sandbox: Sandbox
  cachedAt: number
}

const CACHE_TTL_MS = 30_000
const sandboxCache = new Map<string, CachedSandbox>()

function getClient(): Daytona {
  if (!daytonaClient) {
    daytonaClient = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY,
      apiUrl: process.env.DAYTONA_API_URL || 'https://app.daytona.io/api',
    })
  }
  return daytonaClient
}

async function getSandbox(sandboxId: string, forceRefresh = false): Promise<Sandbox> {
  const cached = sandboxCache.get(sandboxId)
  const now = Date.now()

  if (cached && !forceRefresh && now - cached.cachedAt < CACHE_TTL_MS) {
    return cached.sandbox
  }

  const client = getClient()
  const sandbox = await client.get(sandboxId)
  sandboxCache.set(sandboxId, { sandbox, cachedAt: now })
  return sandbox
}

// ============================================================================
// Output Truncation
// ============================================================================

export interface TruncationConfig {
  maxChars?: number // Max characters for output (default: 2000)
  maxLines?: number // Max lines for file content (default: 500)
  truncationSuffix?: string // Suffix when truncated
}

const DEFAULT_TRUNCATION: TruncationConfig = {
  maxChars: 2000,
  maxLines: 500,
  truncationSuffix: '\n... [output truncated]',
}

export function truncateOutput(
  output: string,
  config: TruncationConfig = {}
): { content: string; wasTruncated: boolean; originalLength: number } {
  const cfg = { ...DEFAULT_TRUNCATION, ...config }
  const originalLength = output.length

  let content = output
  let wasTruncated = false

  // Truncate by lines first if specified
  if (cfg.maxLines) {
    const lines = content.split('\n')
    if (lines.length > cfg.maxLines) {
      content = lines.slice(0, cfg.maxLines).join('\n')
      wasTruncated = true
    }
  }

  // Then truncate by characters
  if (cfg.maxChars && content.length > cfg.maxChars) {
    content = content.slice(0, cfg.maxChars)
    wasTruncated = true
  }

  if (wasTruncated && cfg.truncationSuffix) {
    content += cfg.truncationSuffix
  }

  return { content, wasTruncated, originalLength }
}

// ============================================================================
// Line-Range File Reading
// ============================================================================

export interface ReadFileOptions {
  startLine?: number // 1-indexed start line (inclusive)
  endLine?: number // 1-indexed end line (inclusive)
  maxLines?: number // Max lines to return
}

export interface ReadFileResult {
  content: string
  totalLines: number
  startLine: number
  endLine: number
  wasTruncated: boolean
}

export async function readFileWithLines(
  sandboxId: string,
  path: string,
  options: ReadFileOptions = {}
): Promise<ReadFileResult> {
  const sandbox = await getSandbox(sandboxId)
  const buffer = await sandbox.fs.downloadFile(path)
  const fullContent = buffer.toString('utf-8')
  const lines = fullContent.split('\n')
  const totalLines = lines.length

  let startLine = options.startLine ?? 1
  let endLine = options.endLine ?? totalLines

  // Validate and clamp line numbers
  startLine = Math.max(1, Math.min(startLine, totalLines))
  endLine = Math.max(startLine, Math.min(endLine, totalLines))

  // Apply maxLines limit
  const maxLines = options.maxLines ?? DEFAULT_TRUNCATION.maxLines ?? 500
  if (endLine - startLine + 1 > maxLines) {
    endLine = startLine + maxLines - 1
  }

  // Extract lines (convert to 0-indexed)
  const selectedLines = lines.slice(startLine - 1, endLine)
  const content = selectedLines.join('\n')
  const wasTruncated = endLine < totalLines || (options.maxLines !== undefined && totalLines > maxLines)

  return {
    content,
    totalLines,
    startLine,
    endLine,
    wasTruncated,
  }
}

// ============================================================================
// Patch-Based File Editing
// ============================================================================

export interface FileEdit {
  startLine: number // 1-indexed start line (inclusive)
  endLine: number // 1-indexed end line (inclusive)
  content: string // New content to replace the range
}

export interface EditFileOptions {
  edits: FileEdit[]
  createIfMissing?: boolean
}

export interface EditFileResult {
  success: boolean
  linesModified: number
  totalLines: number
}

export async function editFile(
  sandboxId: string,
  path: string,
  options: EditFileOptions
): Promise<EditFileResult> {
  const sandbox = await getSandbox(sandboxId)

  let lines: string[]
  try {
    const buffer = await sandbox.fs.downloadFile(path)
    lines = buffer.toString('utf-8').split('\n')
  } catch (err) {
    if (options.createIfMissing) {
      lines = []
    } else {
      throw err
    }
  }

  // Sort edits by startLine descending (so we can apply from bottom to top)
  const sortedEdits = [...options.edits].sort((a, b) => b.startLine - a.startLine)

  let linesModified = 0

  for (const edit of sortedEdits) {
    // Convert to 0-indexed
    const start = Math.max(0, edit.startLine - 1)
    const end = Math.min(lines.length, edit.endLine)

    // Calculate how many lines will be removed
    const removedCount = end - start

    // Split the new content into lines
    const newLines = edit.content.split('\n')

    // Apply the edit
    lines.splice(start, removedCount, ...newLines)
    linesModified += Math.max(removedCount, newLines.length)
  }

  // Write back
  const newContent = lines.join('\n')
  await sandbox.fs.uploadFile(Buffer.from(newContent, 'utf-8'), path)

  return {
    success: true,
    linesModified,
    totalLines: lines.length,
  }
}

// ============================================================================
// File Operations
// ============================================================================

export async function deleteFile(sandboxId: string, path: string): Promise<void> {
  const sandbox = await getSandbox(sandboxId)
  await sandbox.process.executeCommand(`rm -f "${path}"`, '/')
}

export async function moveFile(
  sandboxId: string,
  from: string,
  to: string
): Promise<void> {
  const sandbox = await getSandbox(sandboxId)
  // Ensure parent directory exists
  const parentDir = to.substring(0, to.lastIndexOf('/'))
  await sandbox.process.executeCommand(`mkdir -p "${parentDir}" && mv "${from}" "${to}"`, '/')
}

export async function copyFile(
  sandboxId: string,
  from: string,
  to: string
): Promise<void> {
  const sandbox = await getSandbox(sandboxId)
  const parentDir = to.substring(0, to.lastIndexOf('/'))
  await sandbox.process.executeCommand(`mkdir -p "${parentDir}" && cp -r "${from}" "${to}"`, '/')
}

// ============================================================================
// Search Operations
// ============================================================================

export interface SearchFilesOptions {
  pattern: string // Glob pattern (e.g., "**/*.tsx")
  path?: string // Directory to search in
  maxResults?: number // Max files to return (default: 50)
}

export interface SearchFilesResult {
  files: string[]
  totalFound: number
  wasTruncated: boolean
}

export async function searchFiles(
  sandboxId: string,
  options: SearchFilesOptions
): Promise<SearchFilesResult> {
  const sandbox = await getSandbox(sandboxId)
  const searchPath = options.path || '.'
  const maxResults = options.maxResults ?? 50

  // Use find with glob pattern
  // Note: Using -name for simple patterns, -path for complex ones
  const result = await sandbox.process.executeCommand(
    `find "${searchPath}" -type f -name "${options.pattern}" 2>/dev/null | head -${maxResults + 1}`,
    '/'
  )

  const output = result.result?.trim() || ''
  const files = output ? output.split('\n').filter(Boolean) : []
  const wasTruncated = files.length > maxResults

  return {
    files: wasTruncated ? files.slice(0, maxResults) : files,
    totalFound: files.length,
    wasTruncated,
  }
}

export interface GrepOptions {
  pattern: string // Regex pattern
  path: string // File or directory to search
  contextLines?: number // Lines of context before/after match
  ignoreCase?: boolean // Case insensitive search
  maxMatches?: number // Max matches to return
}

export interface GrepMatch {
  file: string
  line: number
  content: string
  context?: string[]
}

export interface GrepResult {
  matches: GrepMatch[]
  totalMatches: number
  wasTruncated: boolean
}

export async function grep(
  sandboxId: string,
  options: GrepOptions
): Promise<GrepResult> {
  const sandbox = await getSandbox(sandboxId)

  const contextArg = options.contextLines ? `-C ${options.contextLines}` : ''
  const caseArg = options.ignoreCase ? '-i' : ''
  const maxMatches = options.maxMatches ?? 50

  // Use grep with line numbers
  const result = await sandbox.process.executeCommand(
    `grep -rn ${caseArg} ${contextArg} -E "${options.pattern}" "${options.path}" 2>/dev/null | head -${maxMatches + 1}`,
    '/'
  )

  const output = result.result?.trim() || ''
  const lines = output ? output.split('\n').filter(Boolean) : []
  const wasTruncated = lines.length > maxMatches

  const matches: GrepMatch[] = []
  for (const line of wasTruncated ? lines.slice(0, maxMatches) : lines) {
    // Parse grep output: file:line:content
    const match = line.match(/^([^:]+):(\d+):(.*)$/)
    if (match) {
      matches.push({
        file: match[1],
        line: parseInt(match[2], 10),
        content: match[3],
      })
    }
  }

  return {
    matches,
    totalMatches: lines.length,
    wasTruncated,
  }
}

// ============================================================================
// File Tree Navigation
// ============================================================================

export interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  children?: FileTreeNode[]
}

export interface GetFileTreeOptions {
  path?: string // Root path (default: current directory)
  depth?: number // Max depth (default: 3)
  includeSize?: boolean // Include file sizes
  excludePatterns?: string[] // Patterns to exclude (e.g., node_modules)
}

export async function getFileTree(
  sandboxId: string,
  options: GetFileTreeOptions = {}
): Promise<FileTreeNode> {
  const sandbox = await getSandbox(sandboxId)
  const rootPath = options.path || '.'
  const depth = options.depth ?? 3
  const excludePatterns = options.excludePatterns ?? ['node_modules', '.git', 'dist', 'build']

  // Build exclude args for find
  const excludeArgs = excludePatterns.map((p) => `-name "${p}" -prune -o`).join(' ')

  // Use find with depth limit
  const result = await sandbox.process.executeCommand(
    `find "${rootPath}" -maxdepth ${depth} ${excludeArgs} -print 2>/dev/null | sort`,
    '/'
  )

  const output = result.result?.trim() || ''
  const paths = output ? output.split('\n').filter(Boolean) : []

  // Build tree structure
  const root: FileTreeNode = {
    name: rootPath.split('/').pop() || rootPath,
    path: rootPath,
    type: 'directory',
    children: [],
  }

  const nodeMap = new Map<string, FileTreeNode>()
  nodeMap.set(rootPath, root)

  for (const path of paths) {
    if (path === rootPath) continue

    const parts = path.split('/')
    const name = parts.pop() || ''
    const parentPath = parts.join('/') || rootPath

    // Determine if file or directory
    const isDir = excludePatterns.some((p) => name === p) || !name.includes('.')

    const node: FileTreeNode = {
      name,
      path,
      type: isDir ? 'directory' : 'file',
      children: isDir ? [] : undefined,
    }

    nodeMap.set(path, node)

    // Add to parent
    const parent = nodeMap.get(parentPath)
    if (parent?.children) {
      parent.children.push(node)
    }
  }

  return root
}

// ============================================================================
// Project Detection
// ============================================================================

export interface ProjectInfo {
  framework: string | null
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | null
  language: 'typescript' | 'javascript' | null
  hasTests: boolean
  entryPoints: string[]
}

export async function detectProjectType(
  sandboxId: string,
  appDir: string
): Promise<ProjectInfo> {
  const sandbox = await getSandbox(sandboxId)

  // Check for various framework indicators
  const checks = await sandbox.process.executeCommand(
    `cd "${appDir}" && cat package.json 2>/dev/null`,
    '/'
  )

  let framework: string | null = null
  let packageManager: ProjectInfo['packageManager'] = null
  let language: ProjectInfo['language'] = null
  let hasTests = false
  const entryPoints: string[] = []

  try {
    const pkg = JSON.parse(checks.result || '{}')

    // Detect framework from dependencies
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    if (deps.next) framework = 'next'
    else if (deps.vite) framework = 'vite'
    else if (deps['react-scripts']) framework = 'create-react-app'
    else if (deps.nuxt) framework = 'nuxt'
    else if (deps.svelte || deps['@sveltejs/kit']) framework = 'svelte'
    else if (deps.vue) framework = 'vue'
    else if (deps.angular || deps['@angular/core']) framework = 'angular'
    else if (deps.react) framework = 'react'

    // Detect language
    if (deps.typescript || pkg.devDependencies?.typescript) {
      language = 'typescript'
    } else {
      language = 'javascript'
    }

    // Check for test frameworks
    if (deps.jest || deps.vitest || deps.mocha || deps['@testing-library/react']) {
      hasTests = true
    }

    // Entry points
    if (pkg.main) entryPoints.push(pkg.main)
  } catch {
    // Not a valid package.json
  }

  // Detect package manager from lock files
  const lockCheck = await sandbox.process.executeCommand(
    `cd "${appDir}" && ls -1 package-lock.json yarn.lock pnpm-lock.yaml bun.lockb 2>/dev/null | head -1`,
    '/'
  )
  const lockFile = lockCheck.result?.trim()
  if (lockFile?.includes('bun.lockb')) packageManager = 'bun'
  else if (lockFile?.includes('pnpm-lock')) packageManager = 'pnpm'
  else if (lockFile?.includes('yarn.lock')) packageManager = 'yarn'
  else if (lockFile?.includes('package-lock')) packageManager = 'npm'

  return {
    framework,
    packageManager,
    language,
    hasTests,
    entryPoints,
  }
}

// ============================================================================
// Process Management
// ============================================================================

export interface ProcessInfo {
  sessionId: string
  command?: string
  running: boolean
}

export async function startProcess(
  sandboxId: string,
  command: string,
  options: { cwd?: string; sessionId?: string } = {}
): Promise<string> {
  const sandbox = await getSandbox(sandboxId)
  const sessionId = options.sessionId || `process-${Date.now()}`

  // Best-effort cleanup of any previous session
  try {
    await sandbox.process.deleteSession(sessionId)
  } catch {
    // Session may not exist
  }

  await sandbox.process.createSession(sessionId)
  await sandbox.process.executeSessionCommand(sessionId, {
    command: options.cwd ? `cd ${options.cwd} && ${command}` : command,
    runAsync: true,
  })

  return sessionId
}

export async function stopProcess(
  sandboxId: string,
  sessionId: string
): Promise<void> {
  const sandbox = await getSandbox(sandboxId)
  await sandbox.process.deleteSession(sessionId)
}

export async function listProcesses(sandboxId: string): Promise<ProcessInfo[]> {
  const sandbox = await getSandbox(sandboxId)

  // List running processes (node, npm, vite, etc.)
  const result = await sandbox.process.executeCommand(
    'ps aux | grep -E "node|npm|vite|bun" | grep -v grep',
    '/'
  )

  const processes: ProcessInfo[] = []
  const lines = result.result?.split('\n').filter(Boolean) || []

  for (const line of lines) {
    // Parse ps output
    const parts = line.trim().split(/\s+/)
    if (parts.length >= 11) {
      processes.push({
        sessionId: parts[1], // PID
        command: parts.slice(10).join(' '),
        running: true,
      })
    }
  }

  return processes
}

export interface GetLogsOptions {
  sessionId?: string
  logFile?: string
  lines?: number
}

export async function getLogs(
  sandboxId: string,
  options: GetLogsOptions = {}
): Promise<string> {
  const sandbox = await getSandbox(sandboxId)
  const lines = options.lines ?? 100

  let command: string
  if (options.logFile) {
    command = `tail -${lines} "${options.logFile}" 2>/dev/null`
  } else if (options.sessionId) {
    command = `tail -${lines} /tmp/${options.sessionId}.log 2>/dev/null`
  } else {
    // Default: dev server logs
    command = `tail -${lines} /tmp/dev-server.log 2>/dev/null`
  }

  const result = await sandbox.process.executeCommand(command, '/')
  return result.result || ''
}

// ============================================================================
// Checkpoint Management
// ============================================================================

const CHECKPOINT_DIR = '/.pluto/checkpoints'

export interface Checkpoint {
  label: string
  createdAt: string
  files: string[]
}

export async function createCheckpoint(
  sandboxId: string,
  appDir: string,
  label: string
): Promise<Checkpoint> {
  const sandbox = await getSandbox(sandboxId)
  const checkpointDir = `${appDir}${CHECKPOINT_DIR}/${label}`

  // Create checkpoint directory and copy current state
  await sandbox.process.executeCommand(
    `mkdir -p "${checkpointDir}" && cp -r "${appDir}/src" "${checkpointDir}/" 2>/dev/null`,
    '/'
  )

  // List files in checkpoint
  const listResult = await sandbox.process.executeCommand(
    `find "${checkpointDir}" -type f | head -100`,
    '/'
  )
  const files = listResult.result?.split('\n').filter(Boolean) || []

  const checkpoint: Checkpoint = {
    label,
    createdAt: new Date().toISOString(),
    files,
  }

  // Save checkpoint metadata
  await sandbox.fs.uploadFile(
    Buffer.from(JSON.stringify(checkpoint, null, 2), 'utf-8'),
    `${checkpointDir}/checkpoint.json`
  )

  return checkpoint
}

export async function rollbackCheckpoint(
  sandboxId: string,
  appDir: string,
  label: string
): Promise<boolean> {
  const sandbox = await getSandbox(sandboxId)
  const checkpointDir = `${appDir}${CHECKPOINT_DIR}/${label}`

  // Verify checkpoint exists
  const checkResult = await sandbox.process.executeCommand(
    `test -d "${checkpointDir}/src" && echo "exists" || echo "missing"`,
    '/'
  )

  if (checkResult.result?.trim() !== 'exists') {
    throw new Error(`Checkpoint "${label}" not found`)
  }

  // Restore files
  await sandbox.process.executeCommand(
    `rm -rf "${appDir}/src" && cp -r "${checkpointDir}/src" "${appDir}/"`,
    '/'
  )

  return true
}

export async function listCheckpoints(
  sandboxId: string,
  appDir: string
): Promise<Checkpoint[]> {
  const sandbox = await getSandbox(sandboxId)
  const checkpointsRoot = `${appDir}${CHECKPOINT_DIR}`

  const listResult = await sandbox.process.executeCommand(
    `ls -1 "${checkpointsRoot}" 2>/dev/null`,
    '/'
  )

  const labels = listResult.result?.split('\n').filter(Boolean) || []
  const checkpoints: Checkpoint[] = []

  for (const label of labels) {
    try {
      const buffer = await sandbox.fs.downloadFile(
        `${checkpointsRoot}/${label}/checkpoint.json`
      )
      const checkpoint = JSON.parse(buffer.toString('utf-8'))
      checkpoints.push(checkpoint)
    } catch {
      // Skip invalid checkpoints
    }
  }

  return checkpoints
}

export async function getDiff(
  sandboxId: string,
  appDir: string,
  checkpointLabel?: string
): Promise<string> {
  const sandbox = await getSandbox(sandboxId)

  if (checkpointLabel) {
    const checkpointDir = `${appDir}${CHECKPOINT_DIR}/${checkpointLabel}`
    const result = await sandbox.process.executeCommand(
      `diff -rq "${checkpointDir}/src" "${appDir}/src" 2>/dev/null | head -50`,
      '/'
    )
    return result.result || 'No differences'
  }

  // Without a checkpoint, show git diff if available
  const result = await sandbox.process.executeCommand(
    `cd "${appDir}" && git diff --stat 2>/dev/null || echo "No git repository"`,
    '/'
  )
  return result.result || 'No diff available'
}

// ============================================================================
// Build/Test Operations
// ============================================================================

export interface TestResult {
  success: boolean
  output: string
  exitCode: number
}

export async function runTests(
  sandboxId: string,
  appDir: string,
  command?: string
): Promise<TestResult> {
  const sandbox = await getSandbox(sandboxId)

  // Detect test command if not provided
  let testCommand = command
  if (!testCommand) {
    const projectInfo = await detectProjectType(sandboxId, appDir)
    const pm = projectInfo.packageManager || 'npm'
    testCommand = `${pm} test`
  }

  const result = await sandbox.process.executeCommand(testCommand, appDir, undefined, 120)

  return {
    success: result.exitCode === 0,
    output: truncateOutput(result.result || '').content,
    exitCode: result.exitCode ?? 1,
  }
}

export async function formatCode(
  sandboxId: string,
  appDir: string,
  command?: string
): Promise<{ success: boolean; output: string }> {
  const sandbox = await getSandbox(sandboxId)

  const formatCommand =
    command || 'npx prettier --write "src/**/*.{ts,tsx,js,jsx,json,css}" 2>&1'

  const result = await sandbox.process.executeCommand(formatCommand, appDir, undefined, 60)

  return {
    success: result.exitCode === 0,
    output: truncateOutput(result.result || '').content,
  }
}

export async function installDependencies(
  sandboxId: string,
  appDir: string,
  packages?: string[]
): Promise<{ success: boolean; output: string }> {
  const sandbox = await getSandbox(sandboxId)

  // Detect package manager
  const projectInfo = await detectProjectType(sandboxId, appDir)
  const pm = projectInfo.packageManager || 'npm'

  let command: string
  if (packages && packages.length > 0) {
    const pkgList = packages.join(' ')
    command =
      pm === 'npm'
        ? `npm install --legacy-peer-deps ${pkgList}`
        : `${pm} add ${pkgList}`
  } else {
    command = pm === 'npm' ? 'npm install --legacy-peer-deps' : `${pm} install`
  }

  const result = await sandbox.process.executeCommand(`${command} 2>&1`, appDir, undefined, 300)

  return {
    success: result.exitCode === 0,
    output: truncateOutput(result.result || '', { maxChars: 1000 }).content,
  }
}
