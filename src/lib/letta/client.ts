import { Letta } from '@letta-ai/letta-client'

// Singleton Letta client
let lettaClient: Letta | null = null

/**
 * Get the Letta client singleton instance.
 * Returns null if Letta is not configured (missing API key).
 */
export function getLettaClient(): Letta | null {
  const apiKey = process.env.LETTA_API_KEY
  if (!apiKey) {
    return null
  }

  if (!lettaClient) {
    const baseURL = process.env.LETTA_BASE_URL || 'https://api.letta.com'
    lettaClient = new Letta({
      baseURL,
      apiKey,
    })
  }

  return lettaClient
}

/**
 * Check if Letta is configured with valid credentials.
 */
export function isLettaConfigured(): boolean {
  return Boolean(process.env.LETTA_API_KEY)
}

/**
 * Reset the client singleton (useful for testing).
 */
export function resetLettaClient(): void {
  lettaClient = null
}
