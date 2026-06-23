/**
 * Sandbox Pool Stats Endpoint
 *
 * Returns current pool statistics for monitoring dashboards.
 */

import { NextResponse } from 'next/server'
import { getPoolStats, getPoolConfig } from '@/lib/daytona/pool'
import { createRouteClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Require authentication
    const supabase = await createRouteClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stats = await getPoolStats()
    const config = getPoolConfig()

    return NextResponse.json({
      config: {
        targetSize: config.targetSize,
        minReady: config.minReady,
        maxAge: config.maxAge,
        templateVersion: config.templateVersion,
      },
      stats: {
        total: stats.totalCount,
        ready: stats.readyCount,
        warming: stats.warmingCount,
        assigned: stats.assignedCount,
        expired: stats.expiredCount,
        hitRate: stats.hitRate.toFixed(1) + '%',
        oldestReadyAt: stats.oldestReadyAt?.toISOString() || null,
        newestReadyAt: stats.newestReadyAt?.toISOString() || null,
      },
      health: {
        poolHealthy: stats.readyCount >= config.minReady,
        belowTarget: stats.readyCount < config.targetSize,
        needsWarmup: stats.readyCount + stats.warmingCount < config.targetSize,
      },
    })
  } catch (error) {
    console.error('[Pool Stats] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
