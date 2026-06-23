/**
 * Incremental Context Loading
 *
 * Manages context loading to minimize token usage by:
 * - Tracking which files have been read in the conversation
 * - Loading only relevant context based on user request
 * - Providing smart file recommendations
 * - Caching file metadata for quick lookups
 */

import { Daytona } from '@daytona/sdk'
import * as ops from '@/lib/daytona/operations'
import type { FileSummary, ProjectSummary } from './summarizer'

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

// Configuration
const CONFIG = {
  // Max files to include in initial context
  maxInitialFiles: 5,
  // Max files to recommend
  maxRecommendations: 10,
  // Max snippet length in chars
  maxSnippetLength: 500,
  // Keywords that indicate file relevance
  fileKeywords: ['component', 'page', 'hook', 'util', 'api', 'config', 'style', 'test'],
}

/**
 * Context state that persists across a conversation
 */
export interface ContextState {
  // Files that have been fully read in this conversation
  readFiles: Set<string>
  // Files that have been modified
  modifiedFiles: Set<string>
  // File summaries loaded
  fileSummaries: Map<string, FileSummary>
  // Project summary
  projectSummary: ProjectSummary | null
  // Last user intent (for relevance scoring)
  lastIntent: string | null
}

/**
 * Create initial context state
 */
export function createContextState(): ContextState {
  return {
    readFiles: new Set(),
    modifiedFiles: new Set(),
    fileSummaries: new Map(),
    projectSummary: null,
    lastIntent: null,
  }
}

/**
 * File relevance score for prioritization
 */
interface FileRelevance {
  path: string
  score: number
  reasons: string[]
}

/**
 * Calculate relevance of a file to a user request
 */
function calculateRelevance(
  filePath: string,
  fileSummary: FileSummary | null,
  userRequest: string,
  state: ContextState
): FileRelevance {
  const reasons: string[] = []
  let score = 0

  const requestLower = userRequest.toLowerCase()
  const fileName = filePath.split('/').pop() || ''
  const fileNameLower = fileName.toLowerCase()

  // Direct file mention
  if (requestLower.includes(fileNameLower.replace(/\.[^.]+$/, ''))) {
    score += 100
    reasons.push('File mentioned in request')
  }

  // Recently modified files are more relevant
  if (state.modifiedFiles.has(filePath)) {
    score += 30
    reasons.push('Recently modified')
  }

  // Extract keywords from request
  const requestWords = requestLower.match(/\b\w{3,}\b/g) || []

  // Check file name matches
  for (const word of requestWords) {
    if (fileNameLower.includes(word)) {
      score += 20
      reasons.push(`Name contains "${word}"`)
    }
  }

  // Check summary content
  if (fileSummary) {
    // Check exports
    for (const exp of fileSummary.exports) {
      const expLower = exp.toLowerCase()
      for (const word of requestWords) {
        if (expLower.includes(word)) {
          score += 15
          reasons.push(`Exports "${exp}" matches "${word}"`)
          break
        }
      }
    }

    // File type relevance
    if (requestLower.includes('style') && fileSummary.type === 'style') {
      score += 25
      reasons.push('Style file for style request')
    }
    if (requestLower.includes('test') && fileSummary.type === 'test') {
      score += 25
      reasons.push('Test file for test request')
    }
    if (
      (requestLower.includes('component') || requestLower.includes('ui')) &&
      fileSummary.type === 'component'
    ) {
      score += 20
      reasons.push('Component file for UI request')
    }
    if (requestLower.includes('api') && fileSummary.type === 'api') {
      score += 25
      reasons.push('API file for API request')
    }
  }

  // Entry point files are always somewhat relevant
  if (
    fileName === 'App.tsx' ||
    fileName === 'main.tsx' ||
    fileName === 'index.tsx' ||
    fileName === 'package.json'
  ) {
    score += 10
    reasons.push('Entry point file')
  }

  // Penalize already-read files slightly (agent already has context)
  if (state.readFiles.has(filePath)) {
    score -= 5
    reasons.push('Already read')
  }

  return { path: filePath, score, reasons }
}

/**
 * Get relevant files for a user request
 */
export async function getRelevantFiles(
  sandboxId: string,
  appDir: string,
  userRequest: string,
  state: ContextState,
  options: { maxFiles?: number } = {}
): Promise<FileRelevance[]> {
  const maxFiles = options.maxFiles ?? CONFIG.maxRecommendations
  const client = getClient()
  const sandbox = await client.get(sandboxId)

  // Get all TypeScript/JavaScript files
  const findResult = await sandbox.process.executeCommand(
    `find "${appDir}/src" -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \\) 2>/dev/null | head -100`,
    '/'
  )

  const files = findResult.result?.split('\n').filter(Boolean) || []

  // Calculate relevance for each file
  const relevanceScores: FileRelevance[] = []

  for (const filePath of files) {
    const summary = state.fileSummaries.get(filePath) || null
    const relevance = calculateRelevance(filePath, summary, userRequest, state)
    if (relevance.score > 0) {
      relevanceScores.push(relevance)
    }
  }

  // Sort by score descending
  relevanceScores.sort((a, b) => b.score - a.score)

  return relevanceScores.slice(0, maxFiles)
}

/**
 * Smart context snippet - get just the relevant part of a file
 */
export async function getFileSnippet(
  sandboxId: string,
  filePath: string,
  searchTerms: string[]
): Promise<{ snippet: string; startLine: number; endLine: number } | null> {
  try {
    // Use grep to find relevant lines
    const grepPattern = searchTerms.join('|')
    const grepResult = await ops.grep(sandboxId, {
      pattern: grepPattern,
      path: filePath,
      contextLines: 5,
      ignoreCase: true,
      maxMatches: 3,
    })

    if (grepResult.matches.length === 0) {
      return null
    }

    // Get lines around the matches
    const matchLines = grepResult.matches.map((m) => m.line)
    const minLine = Math.max(1, Math.min(...matchLines) - 10)
    const maxLine = Math.max(...matchLines) + 10

    const fileResult = await ops.readFileWithLines(sandboxId, filePath, {
      startLine: minLine,
      endLine: maxLine,
    })

    return {
      snippet: fileResult.content,
      startLine: minLine,
      endLine: maxLine,
    }
  } catch {
    return null
  }
}

/**
 * Build focused context for a user request
 */
export interface FocusedContext {
  // Compact project overview
  projectOverview: string
  // Relevant file snippets
  fileSnippets: Array<{
    path: string
    snippet: string
    relevance: string
  }>
  // Recommendations for files to read
  recommendations: string[]
  // Estimated token count
  estimatedTokens: number
}

export async function buildFocusedContext(
  sandboxId: string,
  appDir: string,
  userRequest: string,
  state: ContextState
): Promise<FocusedContext> {
  // Get relevant files
  const relevantFiles = await getRelevantFiles(
    sandboxId,
    appDir,
    userRequest,
    state,
    { maxFiles: CONFIG.maxInitialFiles }
  )

  // Extract search terms from request
  const searchTerms = (userRequest.match(/\b\w{3,}\b/g) || []).slice(0, 5)

  // Get snippets for relevant files
  const fileSnippets: FocusedContext['fileSnippets'] = []

  for (const file of relevantFiles.slice(0, 3)) {
    const snippet = await getFileSnippet(sandboxId, file.path, searchTerms)
    if (snippet) {
      fileSnippets.push({
        path: file.path,
        snippet: snippet.snippet.slice(0, CONFIG.maxSnippetLength),
        relevance: file.reasons.join(', '),
      })
    }
  }

  // Build project overview
  let projectOverview = ''
  if (state.projectSummary) {
    const ps = state.projectSummary
    projectOverview = `Framework: ${ps.framework || 'React'}\n`
    projectOverview += `Components: ${ps.components.map((c) => c.name).join(', ')}\n`
    if (ps.routes.length > 0) {
      projectOverview += `Routes: ${ps.routes.map((r) => r.path).join(', ')}\n`
    }
  }

  // Recommendations
  const recommendations = relevantFiles
    .slice(3, CONFIG.maxRecommendations)
    .map((f) => `${f.path} (${f.reasons[0] || 'relevant'})`)

  // Estimate tokens
  const estimatedTokens = Math.ceil(
    (projectOverview.length +
      fileSnippets.reduce((sum, s) => sum + s.snippet.length, 0) +
      recommendations.join('\n').length) /
      4
  )

  return {
    projectOverview,
    fileSnippets,
    recommendations,
    estimatedTokens,
  }
}

/**
 * Format focused context for LLM
 */
export function formatFocusedContext(context: FocusedContext): string {
  let output = ''

  if (context.projectOverview) {
    output += `## Project Overview\n${context.projectOverview}\n\n`
  }

  if (context.fileSnippets.length > 0) {
    output += `## Relevant Code\n\n`
    for (const snippet of context.fileSnippets) {
      output += `### ${snippet.path}\n`
      output += `Relevance: ${snippet.relevance}\n`
      output += '```\n' + snippet.snippet + '\n```\n\n'
    }
  }

  if (context.recommendations.length > 0) {
    output += `## Other Relevant Files\n`
    output += `Consider reading these files for more context:\n`
    for (const rec of context.recommendations) {
      output += `- ${rec}\n`
    }
  }

  return output
}

/**
 * Update context state after a file is read
 */
export function markFileRead(state: ContextState, filePath: string): ContextState {
  const newReadFiles = new Set(state.readFiles)
  newReadFiles.add(filePath)
  return { ...state, readFiles: newReadFiles }
}

/**
 * Update context state after a file is modified
 */
export function markFileModified(state: ContextState, filePath: string): ContextState {
  const newModifiedFiles = new Set(state.modifiedFiles)
  newModifiedFiles.add(filePath)
  return { ...state, modifiedFiles: newModifiedFiles }
}

/**
 * Add a file summary to context state
 */
export function addFileSummary(
  state: ContextState,
  summary: FileSummary
): ContextState {
  const newSummaries = new Map(state.fileSummaries)
  newSummaries.set(summary.path, summary)
  return { ...state, fileSummaries: newSummaries }
}

/**
 * Set project summary in context state
 */
export function setProjectSummary(
  state: ContextState,
  summary: ProjectSummary
): ContextState {
  return { ...state, projectSummary: summary }
}

/**
 * Update last intent
 */
export function setLastIntent(state: ContextState, intent: string): ContextState {
  return { ...state, lastIntent: intent }
}
