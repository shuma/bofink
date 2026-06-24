import { NextResponse } from 'next/server'
import { getLettaClient, isLettaEnabled } from '@/lib/letta'

export const dynamic = 'force-dynamic'

interface HealthResponse {
  enabled: boolean
  configured: boolean
  status: 'healthy' | 'unhealthy' | 'disabled'
  error?: string
  timestamp: string
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const timestamp = new Date().toISOString()

  // Check if Letta is enabled
  const enabled = isLettaEnabled()

  if (!enabled) {
    return NextResponse.json({
      enabled: false,
      configured: false,
      status: 'disabled',
      timestamp,
    })
  }

  // Get the client to check configuration
  const client = getLettaClient()

  if (!client) {
    return NextResponse.json({
      enabled: true,
      configured: false,
      status: 'unhealthy',
      error: 'Letta client not configured (missing API key)',
      timestamp,
    })
  }

  // Try a simple API call to verify connectivity
  try {
    // List agents (limited to 1) as a health check
    await client.agents.list({ limit: 1 })

    return NextResponse.json({
      enabled: true,
      configured: true,
      status: 'healthy',
      timestamp,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        enabled: true,
        configured: true,
        status: 'unhealthy',
        error: errorMessage,
        timestamp,
      },
      { status: 503 }
    )
  }
}
