/**
 * File and Project Summarizer
 *
 * Generates compact summaries of files and projects to reduce token usage.
 * Summaries are cached in the sandbox filesystem for reuse.
 *
 * Supports two modes:
 * - Rule-based: Fast, no API calls, extracts exports/imports
 * - LLM-based: Uses haiku for intelligent semantic summaries
 */

import { Daytona, Sandbox } from '@daytona/sdk'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import * as crypto from 'crypto'

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

// Summary cache directory in sandbox
const SUMMARY_CACHE_DIR = '/.pluto/summaries'

// ============================================================================
// Types
// ============================================================================

export interface FileSummary {
  path: string
  type: FileType
  exports: string[]
  imports: string[]
  lineCount: number
  hash: string
  summary: string
  createdAt: string
}

export type FileType =
  | 'component'
  | 'page'
  | 'hook'
  | 'util'
  | 'config'
  | 'style'
  | 'test'
  | 'type'
  | 'api'
  | 'unknown'

export interface ProjectSummary {
  framework: string | null
  packageManager: string | null
  language: 'typescript' | 'javascript' | null
  entryPoints: string[]
  components: ComponentInfo[]
  pages: string[]
  hooks: string[]
  utils: string[]
  routes: RouteInfo[]
  dependencies: DependencyInfo[]
  createdAt: string
}

export interface ComponentInfo {
  name: string
  path: string
  props?: string[]
}

export interface RouteInfo {
  path: string
  component: string
  file: string
}

export interface DependencyInfo {
  name: string
  version: string
  type: 'production' | 'development'
}

// ============================================================================
// File Type Detection
// ============================================================================

function detectFileType(path: string, content: string): FileType {
  const filename = path.split('/').pop() || ''
  const ext = filename.split('.').pop()?.toLowerCase()

  // Config files
  if (
    filename.match(/^(vite|next|tailwind|postcss|tsconfig|package)\./) ||
    filename === '.prettierrc' ||
    filename === '.eslintrc'
  ) {
    return 'config'
  }

  // Test files
  if (filename.includes('.test.') || filename.includes('.spec.') || path.includes('__tests__')) {
    return 'test'
  }

  // Style files
  if (ext === 'css' || ext === 'scss' || ext === 'less') {
    return 'style'
  }

  // Type definition files
  if (filename.endsWith('.d.ts') || filename === 'types.ts') {
    return 'type'
  }

  // Path-based detection
  if (path.includes('/pages/') || path.includes('/app/') && !path.includes('/api/')) {
    return 'page'
  }

  if (path.includes('/api/')) {
    return 'api'
  }

  if (path.includes('/hooks/') || filename.startsWith('use')) {
    return 'hook'
  }

  if (path.includes('/components/')) {
    return 'component'
  }

  if (path.includes('/utils/') || path.includes('/lib/') || path.includes('/helpers/')) {
    return 'util'
  }

  // Content-based detection for React components
  if (
    (ext === 'tsx' || ext === 'jsx') &&
    (content.includes('export default function') ||
      content.includes('export function') ||
      content.includes('React.FC') ||
      content.includes(': FC'))
  ) {
    return 'component'
  }

  return 'unknown'
}

// ============================================================================
// Content Parsing
// ============================================================================

function extractExports(content: string): string[] {
  const exports: string[] = []

  // Named exports
  const namedExportRegex = /export\s+(?:const|let|var|function|class|type|interface)\s+(\w+)/g
  let match
  while ((match = namedExportRegex.exec(content)) !== null) {
    exports.push(match[1])
  }

  // Default export function/class
  const defaultFuncRegex = /export\s+default\s+(?:function|class)\s+(\w+)/
  const defaultMatch = content.match(defaultFuncRegex)
  if (defaultMatch) {
    exports.push(`default: ${defaultMatch[1]}`)
  }

  // Export { ... } statements
  const exportBraceRegex = /export\s*\{\s*([^}]+)\s*\}/g
  while ((match = exportBraceRegex.exec(content)) !== null) {
    const items = match[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0])
    exports.push(...items.filter(Boolean))
  }

  return [...new Set(exports)]
}

function extractImports(content: string): string[] {
  const imports: string[] = []

  // import ... from '...'
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g
  let match
  while ((match = importRegex.exec(content)) !== null) {
    const moduleName = match[1]
    // Only include package imports, not relative paths
    if (!moduleName.startsWith('.') && !moduleName.startsWith('@/')) {
      // Get the package name (handle scoped packages)
      const pkgName = moduleName.startsWith('@')
        ? moduleName.split('/').slice(0, 2).join('/')
        : moduleName.split('/')[0]
      imports.push(pkgName)
    }
  }

  return [...new Set(imports)]
}

function extractComponentProps(content: string): string[] {
  const props: string[] = []

  // interface Props { ... }
  const propsInterfaceRegex = /interface\s+(?:\w+)?Props\s*\{([^}]+)\}/
  const match = content.match(propsInterfaceRegex)
  if (match) {
    const propsContent = match[1]
    const propRegex = /(\w+)\s*[?:]?\s*:/g
    let propMatch
    while ((propMatch = propRegex.exec(propsContent)) !== null) {
      props.push(propMatch[1])
    }
  }

  return props
}

function generateFileSummary(content: string, fileType: FileType): string {
  const lines = content.split('\n')
  const lineCount = lines.length

  // Take first meaningful lines (skip imports)
  const meaningfulLines = lines.filter(
    (line) =>
      line.trim() &&
      !line.trim().startsWith('import') &&
      !line.trim().startsWith('//')
  )

  const firstLines = meaningfulLines.slice(0, 5).join('\n')

  switch (fileType) {
    case 'component':
      return `React component (${lineCount} lines). ${firstLines.substring(0, 100)}...`
    case 'page':
      return `Page component (${lineCount} lines). ${firstLines.substring(0, 100)}...`
    case 'hook':
      return `Custom React hook (${lineCount} lines). ${firstLines.substring(0, 100)}...`
    case 'util':
      return `Utility functions (${lineCount} lines). ${firstLines.substring(0, 100)}...`
    case 'config':
      return `Configuration file (${lineCount} lines).`
    case 'style':
      return `Stylesheet (${lineCount} lines).`
    case 'test':
      return `Test file (${lineCount} lines).`
    case 'type':
      return `Type definitions (${lineCount} lines).`
    case 'api':
      return `API route handler (${lineCount} lines).`
    default:
      return `File (${lineCount} lines).`
  }
}

function computeHash(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex').substring(0, 8)
}

// ============================================================================
// File Summary Operations
// ============================================================================

export async function summarizeFile(
  sandboxId: string,
  path: string
): Promise<FileSummary> {
  const sandbox = await getSandbox(sandboxId)

  // Read file content
  const buffer = await sandbox.fs.downloadFile(path)
  const content = buffer.toString('utf-8')
  const hash = computeHash(content)

  // Check cache
  const cacheKey = path.replace(/\//g, '_')
  const cachePath = `${SUMMARY_CACHE_DIR}/${cacheKey}.json`

  try {
    const cacheBuffer = await sandbox.fs.downloadFile(cachePath)
    const cached = JSON.parse(cacheBuffer.toString('utf-8')) as FileSummary
    if (cached.hash === hash) {
      return cached
    }
  } catch {
    // Cache miss or invalid
  }

  // Generate summary
  const fileType = detectFileType(path, content)
  const exports = extractExports(content)
  const imports = extractImports(content)
  const summary = generateFileSummary(content, fileType)

  const fileSummary: FileSummary = {
    path,
    type: fileType,
    exports,
    imports,
    lineCount: content.split('\n').length,
    hash,
    summary,
    createdAt: new Date().toISOString(),
  }

  // Cache the summary
  try {
    await sandbox.process.executeCommand(`mkdir -p ${SUMMARY_CACHE_DIR}`, '/')
    await sandbox.fs.uploadFile(
      Buffer.from(JSON.stringify(fileSummary, null, 2), 'utf-8'),
      cachePath
    )
  } catch {
    // Ignore cache write errors
  }

  return fileSummary
}

// ============================================================================
// LLM-Based File Summarization
// ============================================================================

/**
 * Extended file summary with AI-generated insights
 */
export interface EnhancedFileSummary extends FileSummary {
  aiSummary: string
  purpose: string
  keyFunctions: string[]
  dependencies: string[]
  usedBy?: string[]
}

/**
 * Generate an intelligent summary of a file using LLM
 *
 * Uses haiku for fast, cheap summarization while capturing semantic meaning.
 */
export async function summarizeFileWithLLM(
  sandboxId: string,
  path: string,
  options: { forceRefresh?: boolean } = {}
): Promise<EnhancedFileSummary> {
  const sandbox = await getSandbox(sandboxId)

  // Read file content
  const buffer = await sandbox.fs.downloadFile(path)
  const content = buffer.toString('utf-8')
  const hash = computeHash(content)

  // Check cache for AI summary
  const cacheKey = path.replace(/\//g, '_') + '_ai'
  const cachePath = `${SUMMARY_CACHE_DIR}/${cacheKey}.json`

  if (!options.forceRefresh) {
    try {
      const cacheBuffer = await sandbox.fs.downloadFile(cachePath)
      const cached = JSON.parse(cacheBuffer.toString('utf-8')) as EnhancedFileSummary
      if (cached.hash === hash) {
        return cached
      }
    } catch {
      // Cache miss or invalid
    }
  }

  // Get basic summary first
  const fileType = detectFileType(path, content)
  const exports = extractExports(content)
  const imports = extractImports(content)

  // Truncate content for LLM (keep first 2000 chars)
  const truncatedContent = content.length > 2000
    ? content.slice(0, 2000) + '\n... [truncated]'
    : content

  // Generate AI summary using haiku
  const result = await generateText({
    model: anthropic('claude-3-5-haiku-20241022'),
    system: `You are a code analyzer. Analyze the given code file and provide a structured summary.
Output ONLY valid JSON with this exact structure:
{
  "purpose": "One sentence describing what this file does",
  "aiSummary": "2-3 sentence summary of the file's functionality",
  "keyFunctions": ["function1", "function2"],
  "dependencies": ["what this file depends on"],
  "usedBy": ["what might use this file"]
}
Be concise. Focus on what matters for understanding the codebase.`,
    prompt: `File: ${path}\nType: ${fileType}\n\nContent:\n${truncatedContent}`,
  })

  // Parse AI response
  let aiData: {
    purpose: string
    aiSummary: string
    keyFunctions: string[]
    dependencies: string[]
    usedBy?: string[]
  }

  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = result.text.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim()
    }
    aiData = JSON.parse(jsonStr)
  } catch {
    // Fallback if parsing fails
    aiData = {
      purpose: `${fileType} file`,
      aiSummary: result.text.slice(0, 200),
      keyFunctions: exports.slice(0, 5),
      dependencies: imports,
    }
  }

  const enhancedSummary: EnhancedFileSummary = {
    path,
    type: fileType,
    exports,
    imports,
    lineCount: content.split('\n').length,
    hash,
    summary: generateFileSummary(content, fileType),
    createdAt: new Date().toISOString(),
    aiSummary: aiData.aiSummary,
    purpose: aiData.purpose,
    keyFunctions: aiData.keyFunctions || [],
    dependencies: aiData.dependencies || [],
    usedBy: aiData.usedBy,
  }

  // Cache the enhanced summary
  try {
    await sandbox.process.executeCommand(`mkdir -p ${SUMMARY_CACHE_DIR}`, '/')
    await sandbox.fs.uploadFile(
      Buffer.from(JSON.stringify(enhancedSummary, null, 2), 'utf-8'),
      cachePath
    )
  } catch {
    // Ignore cache write errors
  }

  return enhancedSummary
}

/**
 * Batch summarize multiple files with LLM
 *
 * More efficient than individual calls for multiple files.
 */
export async function batchSummarizeFiles(
  sandboxId: string,
  paths: string[],
  options: { useLLM?: boolean; maxConcurrent?: number } = {}
): Promise<Map<string, FileSummary | EnhancedFileSummary>> {
  const results = new Map<string, FileSummary | EnhancedFileSummary>()
  const maxConcurrent = options.maxConcurrent ?? 3

  // Process in batches
  for (let i = 0; i < paths.length; i += maxConcurrent) {
    const batch = paths.slice(i, i + maxConcurrent)
    const promises = batch.map(async (path) => {
      try {
        const summary = options.useLLM
          ? await summarizeFileWithLLM(sandboxId, path)
          : await summarizeFile(sandboxId, path)
        results.set(path, summary)
      } catch (err) {
        console.warn(`Failed to summarize ${path}:`, err)
      }
    })
    await Promise.all(promises)
  }

  return results
}

/**
 * Generate a compact codebase overview using LLM
 */
export async function generateCodebaseOverview(
  sandboxId: string,
  appDir: string
): Promise<string> {
  const sandbox = await getSandbox(sandboxId)

  // Get file list
  const findResult = await sandbox.process.executeCommand(
    `find "${appDir}/src" -type f \\( -name "*.ts" -o -name "*.tsx" \\) 2>/dev/null | head -30`,
    '/'
  )
  const files = findResult.result?.split('\n').filter(Boolean) || []

  // Get basic summaries for key files
  const summaries: string[] = []
  for (const file of files.slice(0, 10)) {
    try {
      const summary = await summarizeFile(sandboxId, file)
      summaries.push(`${file}: ${summary.type} - exports: ${summary.exports.join(', ')}`)
    } catch {
      // Skip unreadable files
    }
  }

  // Generate overview with LLM
  const result = await generateText({
    model: anthropic('claude-3-5-haiku-20241022'),
    system: `You are a code analyst. Generate a brief, structured overview of a codebase based on file summaries.
Focus on:
- Overall architecture
- Key components and their relationships
- Main functionality
Keep it under 300 words.`,
    prompt: `Codebase files:\n${summaries.join('\n')}`,
  })

  return result.text
}

// ============================================================================
// Project Summary Operations
// ============================================================================

export async function summarizeProject(
  sandboxId: string,
  appDir: string
): Promise<ProjectSummary> {
  const sandbox = await getSandbox(sandboxId)

  // Read package.json
  let pkg: Record<string, unknown> = {}
  let framework: string | null = null
  let packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | null = null
  let language: 'typescript' | 'javascript' | null = null

  try {
    const pkgBuffer = await sandbox.fs.downloadFile(`${appDir}/package.json`)
    pkg = JSON.parse(pkgBuffer.toString('utf-8'))

    const deps = {
      ...(pkg.dependencies as Record<string, string> || {}),
      ...(pkg.devDependencies as Record<string, string> || {}),
    }

    // Detect framework
    if (deps.next) framework = 'next'
    else if (deps.vite) framework = 'vite'
    else if (deps['react-scripts']) framework = 'create-react-app'
    else if (deps.nuxt) framework = 'nuxt'
    else if (deps.svelte) framework = 'svelte'
    else if (deps.vue) framework = 'vue'
    else if (deps.react) framework = 'react'

    // Detect language
    if (deps.typescript) language = 'typescript'
    else language = 'javascript'
  } catch {
    // No package.json
  }

  // Detect package manager
  const lockCheck = await sandbox.process.executeCommand(
    `cd "${appDir}" && ls -1 bun.lockb pnpm-lock.yaml yarn.lock package-lock.json 2>/dev/null | head -1`,
    '/'
  )
  const lockFile = lockCheck.result?.trim()
  if (lockFile?.includes('bun')) packageManager = 'bun'
  else if (lockFile?.includes('pnpm')) packageManager = 'pnpm'
  else if (lockFile?.includes('yarn')) packageManager = 'yarn'
  else if (lockFile?.includes('npm') || lockFile?.includes('package-lock')) packageManager = 'npm'

  // Find components
  const componentResult = await sandbox.process.executeCommand(
    `find "${appDir}/src" -name "*.tsx" -path "*/components/*" 2>/dev/null | head -50`,
    '/'
  )
  const componentPaths = componentResult.result?.split('\n').filter(Boolean) || []

  const components: ComponentInfo[] = []
  for (const path of componentPaths.slice(0, 20)) {
    try {
      const buffer = await sandbox.fs.downloadFile(path)
      const content = buffer.toString('utf-8')
      const name = path.split('/').pop()?.replace(/\.(tsx|jsx)$/, '') || ''
      const props = extractComponentProps(content)
      components.push({ name, path, props: props.length ? props : undefined })
    } catch {
      // Skip unreadable files
    }
  }

  // Find pages
  const pageResult = await sandbox.process.executeCommand(
    `find "${appDir}/src" -name "*.tsx" -path "*/pages/*" 2>/dev/null | head -20`,
    '/'
  )
  const pages = pageResult.result?.split('\n').filter(Boolean) || []

  // Find hooks
  const hookResult = await sandbox.process.executeCommand(
    `find "${appDir}/src" -name "use*.ts" -o -name "use*.tsx" 2>/dev/null | head -20`,
    '/'
  )
  const hooks = hookResult.result?.split('\n').filter(Boolean) || []

  // Find utils
  const utilResult = await sandbox.process.executeCommand(
    `find "${appDir}/src" -path "*/utils/*" -o -path "*/lib/*" 2>/dev/null | head -20`,
    '/'
  )
  const utils = utilResult.result?.split('\n').filter(Boolean) || []

  // Parse routes from App.tsx or router config
  const routes: RouteInfo[] = []
  try {
    const appBuffer = await sandbox.fs.downloadFile(`${appDir}/src/App.tsx`)
    const appContent = appBuffer.toString('utf-8')

    // Simple route extraction from React Router
    const routeRegex = /<Route\s+path=["']([^"']+)["']\s+element=\{<(\w+)/g
    let match
    while ((match = routeRegex.exec(appContent)) !== null) {
      routes.push({
        path: match[1],
        component: match[2],
        file: `${appDir}/src/App.tsx`,
      })
    }
  } catch {
    // No App.tsx or different structure
  }

  // Extract dependencies
  const dependencies: DependencyInfo[] = []
  const prodDeps = (pkg.dependencies as Record<string, string>) || {}
  const devDeps = (pkg.devDependencies as Record<string, string>) || {}

  for (const [name, version] of Object.entries(prodDeps)) {
    dependencies.push({ name, version, type: 'production' })
  }
  for (const [name, version] of Object.entries(devDeps)) {
    dependencies.push({ name, version, type: 'development' })
  }

  const entryPoints: string[] = []
  if (pkg.main) entryPoints.push(pkg.main as string)
  entryPoints.push(`${appDir}/src/main.tsx`)

  return {
    framework,
    packageManager,
    language,
    entryPoints,
    components,
    pages,
    hooks,
    utils,
    routes,
    dependencies,
    createdAt: new Date().toISOString(),
  }
}

// ============================================================================
// Context Builder
// ============================================================================

export interface ProjectContext {
  summary: ProjectSummary
  relevantFiles: FileSummary[]
}

export async function buildProjectContext(
  sandboxId: string,
  appDir: string,
  userRequest?: string
): Promise<ProjectContext> {
  // Get project summary
  const summary = await summarizeProject(sandboxId, appDir)

  // Find relevant files based on user request
  const relevantFiles: FileSummary[] = []

  // Always include key files
  const keyFiles = [
    `${appDir}/src/App.tsx`,
    `${appDir}/src/main.tsx`,
    `${appDir}/package.json`,
  ]

  for (const path of keyFiles) {
    try {
      const fileSummary = await summarizeFile(sandboxId, path)
      relevantFiles.push(fileSummary)
    } catch {
      // File doesn't exist
    }
  }

  // If user request mentions specific files or components, include those
  if (userRequest) {
    const sandbox = await getSandbox(sandboxId)

    // Search for mentioned terms in file names
    const terms = userRequest.toLowerCase().match(/\b\w{3,}\b/g) || []
    for (const term of terms.slice(0, 5)) {
      const searchResult = await sandbox.process.executeCommand(
        `find "${appDir}/src" -iname "*${term}*" -type f 2>/dev/null | head -5`,
        '/'
      )
      const files = searchResult.result?.split('\n').filter(Boolean) || []

      for (const path of files) {
        if (!relevantFiles.some((f) => f.path === path)) {
          try {
            const fileSummary = await summarizeFile(sandboxId, path)
            relevantFiles.push(fileSummary)
          } catch {
            // Skip unreadable files
          }
        }
      }
    }
  }

  return {
    summary,
    relevantFiles: relevantFiles.slice(0, 15), // Limit to avoid token explosion
  }
}

// ============================================================================
// Format for LLM Context
// ============================================================================

export function formatContextForLLM(context: ProjectContext): string {
  const { summary, relevantFiles } = context

  let output = `## Project Overview\n\n`
  output += `- Framework: ${summary.framework || 'Unknown'}\n`
  output += `- Package Manager: ${summary.packageManager || 'npm'}\n`
  output += `- Language: ${summary.language || 'JavaScript'}\n\n`

  if (summary.routes.length > 0) {
    output += `### Routes\n`
    for (const route of summary.routes) {
      output += `- ${route.path} → ${route.component}\n`
    }
    output += '\n'
  }

  if (summary.components.length > 0) {
    output += `### Components (${summary.components.length})\n`
    for (const comp of summary.components.slice(0, 10)) {
      const propsStr = comp.props?.length ? ` (props: ${comp.props.join(', ')})` : ''
      output += `- ${comp.name}${propsStr}\n`
    }
    output += '\n'
  }

  if (relevantFiles.length > 0) {
    output += `### Relevant Files\n`
    for (const file of relevantFiles) {
      output += `\n#### ${file.path}\n`
      output += `Type: ${file.type} | Lines: ${file.lineCount}\n`
      if (file.exports.length > 0) {
        output += `Exports: ${file.exports.join(', ')}\n`
      }
      if (file.imports.length > 0) {
        output += `Dependencies: ${file.imports.join(', ')}\n`
      }
      output += `${file.summary}\n`
    }
  }

  return output
}
