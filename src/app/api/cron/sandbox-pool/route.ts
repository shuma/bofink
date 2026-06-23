/**
 * Sandbox Pool Maintenance Cron Job
 *
 * This endpoint should be called periodically (e.g., every 5 minutes) to:
 * 1. Warm new sandboxes to maintain pool at target size
 * 2. Clean up expired/stale sandboxes
 * 3. Reclaim disk quota from orphaned sandboxes
 *
 * Configure in vercel.json:
 *   "crons": [{ "path": "/api/cron/sandbox-pool", "schedule": "0/5 * * * *" }]
 */

import { NextResponse } from 'next/server'
import { maintainPool, getPoolStats, getPoolConfig } from '@/lib/daytona/pool'

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // If no secret configured, allow in development
  if (!cronSecret) {
    return process.env.NODE_ENV === 'development'
  }

  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: Request) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()

  try {
    console.log('[Cron] Starting sandbox pool maintenance...')

    // Get current stats before maintenance
    const statsBefore = await getPoolStats()
    const config = getPoolConfig()

    // Run maintenance
    const result = await maintainPool()

    // Get stats after maintenance
    const statsAfter = await getPoolStats()

    const duration = Date.now() - startTime

    console.log(`[Cron] Maintenance completed in ${duration}ms`)

    return NextResponse.json({
      success: true,
      duration,
      config: {
        targetSize: config.targetSize,
        minReady: config.minReady,
        maxAge: config.maxAge,
        templateVersion: config.templateVersion,
      },
      maintenance: {
        warmed: result.warmed,
        cleaned: result.cleaned,
        deleted: result.deleted.length,
      },
      statsBefore: {
        total: statsBefore.totalCount,
        ready: statsBefore.readyCount,
        warming: statsBefore.warmingCount,
        assigned: statsBefore.assignedCount,
        expired: statsBefore.expiredCount,
      },
      statsAfter: {
        total: statsAfter.totalCount,
        ready: statsAfter.readyCount,
        warming: statsAfter.warmingCount,
        assigned: statsAfter.assignedCount,
        expired: statsAfter.expiredCount,
        hitRate: statsAfter.hitRate.toFixed(1) + '%',
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[Cron] Maintenance failed:', error)

    return NextResponse.json(
      {
        success: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggers
export async function POST(request: Request) {
  return GET(request)
}
