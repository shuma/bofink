/**
 * Sandbox Metrics Collection
 *
 * Tracks timing, pool, token, and tool metrics for monitoring
 * sandbox performance and optimization effectiveness.
 */

// ============================================================================
// Types
// ============================================================================

export interface TimingMetric {
  name: string
  durationMs: number
  timestamp: Date
  sandboxId?: string
  projectId?: string
  metadata?: Record<string, unknown>
}

export interface PoolMetric {
  timestamp: Date
  totalSize: number
  readyCount: number
  warmingCount: number
  assignedCount: number
  expiredCount: number
  hitRate: number
}

export interface TokenMetric {
  timestamp: Date
  projectId: string
  sandboxId: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  savedBySnippets?: number
  savedBySummaries?: number
}

export interface ToolMetric {
  timestamp: Date
  sandboxId: string
  toolName: string
  durationMs: number
  success: boolean
  error?: string
}

// ============================================================================
// In-Memory Metrics Storage (for development/logging)
// ============================================================================

const metrics = {
  timing: [] as TimingMetric[],
  pool: [] as PoolMetric[],
  tokens: [] as TokenMetric[],
  tools: [] as ToolMetric[],
}

// Keep only last N metrics to avoid memory bloat
const MAX_METRICS_PER_TYPE = 1000

function trimArray<T>(arr: T[], max: number): T[] {
  if (arr.length > max) {
    return arr.slice(arr.length - max)
  }
  return arr
}

// ============================================================================
// Timing Metrics
// ============================================================================

export function recordTiming(metric: Omit<TimingMetric, 'timestamp'>): void {
  const entry: TimingMetric = {
    ...metric,
    timestamp: new Date(),
  }

  metrics.timing.push(entry)
  metrics.timing = trimArray(metrics.timing, MAX_METRICS_PER_TYPE)

  // Log for structured logging systems
  console.log(
    JSON.stringify({
      type: 'timing_metric',
      ...entry,
      timestamp: entry.timestamp.toISOString(),
    })
  )
}

export function createTimer(
  name: string,
  metadata?: Record<string, unknown>
): () => void {
  const start = Date.now()

  return () => {
    const durationMs = Date.now() - start
    recordTiming({ name, durationMs, ...metadata })
  }
}

// Pre-defined timing helpers
export const timers = {
  coldStart: (sandboxId: string, projectId: string) =>
    createTimer('sandbox_cold_start', { sandboxId, projectId }),

  warmStart: (sandboxId: string, projectId: string) =>
    createTimer('sandbox_warm_start', { sandboxId, projectId }),

  acquire: (projectId: string) =>
    createTimer('sandbox_acquire', { projectId }),

  dependencyInstall: (sandboxId: string) =>
    createTimer('dependency_install', { sandboxId }),

  templateScaffold: (sandboxId: string) =>
    createTimer('template_scaffold', { sandboxId }),

  devServerStart: (sandboxId: string) =>
    createTimer('dev_server_start', { sandboxId }),
}

// ============================================================================
// Pool Metrics
// ============================================================================

export function recordPoolMetric(metric: Omit<PoolMetric, 'timestamp'>): void {
  const entry: PoolMetric = {
    ...metric,
    timestamp: new Date(),
  }

  metrics.pool.push(entry)
  metrics.pool = trimArray(metrics.pool, MAX_METRICS_PER_TYPE)

  console.log(
    JSON.stringify({
      type: 'pool_metric',
      ...entry,
      timestamp: entry.timestamp.toISOString(),
    })
  )
}

// ============================================================================
// Token Metrics
// ============================================================================

export function recordTokens(metric: Omit<TokenMetric, 'timestamp'>): void {
  const entry: TokenMetric = {
    ...metric,
    timestamp: new Date(),
  }

  metrics.tokens.push(entry)
  metrics.tokens = trimArray(metrics.tokens, MAX_METRICS_PER_TYPE)

  console.log(
    JSON.stringify({
      type: 'token_metric',
      ...entry,
      timestamp: entry.timestamp.toISOString(),
    })
  )
}

export function estimateTokenSavings(
  fullContentTokens: number,
  snippetTokens: number
): { saved: number; percentage: number } {
  const saved = fullContentTokens - snippetTokens
  const percentage = fullContentTokens > 0 ? (saved / fullContentTokens) * 100 : 0
  return { saved, percentage }
}

// ============================================================================
// Tool Metrics
// ============================================================================

export function recordToolCall(metric: Omit<ToolMetric, 'timestamp'>): void {
  const entry: ToolMetric = {
    ...metric,
    timestamp: new Date(),
  }

  metrics.tools.push(entry)
  metrics.tools = trimArray(metrics.tools, MAX_METRICS_PER_TYPE)

  // Only log errors or slow calls to avoid log spam
  if (!metric.success || metric.durationMs > 5000) {
    console.log(
      JSON.stringify({
        type: 'tool_metric',
        ...entry,
        timestamp: entry.timestamp.toISOString(),
      })
    )
  }
}

export function createToolTimer(
  sandboxId: string,
  toolName: string
): { end: (success: boolean, error?: string) => void } {
  const start = Date.now()

  return {
    end: (success: boolean, error?: string) => {
      recordToolCall({
        sandboxId,
        toolName,
        durationMs: Date.now() - start,
        success,
        error,
      })
    },
  }
}

// ============================================================================
// Aggregation & Reporting
// ============================================================================

export interface MetricsSummary {
  timing: {
    avgColdStartMs: number
    avgWarmStartMs: number
    avgAcquireMs: number
    totalBuilds: number
  }
  pool: {
    currentReadyCount: number
    avgHitRate: number
    totalAcquires: number
  }
  tokens: {
    avgInputTokens: number
    avgOutputTokens: number
    totalTokens: number
    estimatedSavings: number
  }
  tools: {
    totalCalls: number
    successRate: number
    avgDurationMs: number
    mostUsedTools: Array<{ name: string; count: number }>
  }
}

export function getMetricsSummary(
  sinceMinutes: number = 60
): MetricsSummary {
  const cutoff = Date.now() - sinceMinutes * 60 * 1000

  // Filter to recent metrics
  const recentTiming = metrics.timing.filter(
    (m) => m.timestamp.getTime() > cutoff
  )
  const recentPool = metrics.pool.filter(
    (m) => m.timestamp.getTime() > cutoff
  )
  const recentTokens = metrics.tokens.filter(
    (m) => m.timestamp.getTime() > cutoff
  )
  const recentTools = metrics.tools.filter(
    (m) => m.timestamp.getTime() > cutoff
  )

  // Timing aggregation
  const coldStarts = recentTiming.filter((m) => m.name === 'sandbox_cold_start')
  const warmStarts = recentTiming.filter((m) => m.name === 'sandbox_warm_start')
  const acquires = recentTiming.filter((m) => m.name === 'sandbox_acquire')

  const avgColdStartMs =
    coldStarts.length > 0
      ? coldStarts.reduce((sum, m) => sum + m.durationMs, 0) / coldStarts.length
      : 0

  const avgWarmStartMs =
    warmStarts.length > 0
      ? warmStarts.reduce((sum, m) => sum + m.durationMs, 0) / warmStarts.length
      : 0

  const avgAcquireMs =
    acquires.length > 0
      ? acquires.reduce((sum, m) => sum + m.durationMs, 0) / acquires.length
      : 0

  // Pool aggregation
  const latestPool = recentPool[recentPool.length - 1]
  const avgHitRate =
    recentPool.length > 0
      ? recentPool.reduce((sum, m) => sum + m.hitRate, 0) / recentPool.length
      : 0

  // Token aggregation
  const avgInputTokens =
    recentTokens.length > 0
      ? recentTokens.reduce((sum, m) => sum + m.inputTokens, 0) / recentTokens.length
      : 0

  const avgOutputTokens =
    recentTokens.length > 0
      ? recentTokens.reduce((sum, m) => sum + m.outputTokens, 0) / recentTokens.length
      : 0

  const totalTokens = recentTokens.reduce((sum, m) => sum + m.totalTokens, 0)

  const estimatedSavings = recentTokens.reduce(
    (sum, m) => sum + (m.savedBySnippets || 0) + (m.savedBySummaries || 0),
    0
  )

  // Tool aggregation
  const successfulTools = recentTools.filter((m) => m.success)
  const successRate =
    recentTools.length > 0 ? (successfulTools.length / recentTools.length) * 100 : 100

  const avgToolDuration =
    recentTools.length > 0
      ? recentTools.reduce((sum, m) => sum + m.durationMs, 0) / recentTools.length
      : 0

  // Most used tools
  const toolCounts = new Map<string, number>()
  for (const m of recentTools) {
    toolCounts.set(m.toolName, (toolCounts.get(m.toolName) || 0) + 1)
  }
  const mostUsedTools = Array.from(toolCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    timing: {
      avgColdStartMs,
      avgWarmStartMs,
      avgAcquireMs,
      totalBuilds: coldStarts.length + warmStarts.length,
    },
    pool: {
      currentReadyCount: latestPool?.readyCount || 0,
      avgHitRate,
      totalAcquires: recentPool.reduce((sum, m) => sum + m.assignedCount, 0),
    },
    tokens: {
      avgInputTokens,
      avgOutputTokens,
      totalTokens,
      estimatedSavings,
    },
    tools: {
      totalCalls: recentTools.length,
      successRate,
      avgDurationMs: avgToolDuration,
      mostUsedTools,
    },
  }
}

// ============================================================================
// Export for Testing/Debugging
// ============================================================================

export function getRecentMetrics(
  type: 'timing' | 'pool' | 'tokens' | 'tools',
  limit: number = 100
): unknown[] {
  return metrics[type].slice(-limit)
}

export function clearMetrics(): void {
  metrics.timing = []
  metrics.pool = []
  metrics.tokens = []
  metrics.tools = []
}
