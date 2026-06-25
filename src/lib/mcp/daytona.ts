import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

// Singleton client instance
let mcpClient: Client | null = null
let isConnecting = false

/**
 * Get or create the Daytona MCP client
 * This spawns the `daytona mcp start` process and connects to it
 */
export async function getDaytonaMCPClient(): Promise<Client> {
  if (mcpClient) {
    return mcpClient
  }

  if (isConnecting) {
    // Wait for existing connection attempt
    while (isConnecting) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    if (mcpClient) {
      return mcpClient
    }
  }

  isConnecting = true

  try {
    const transport = new StdioClientTransport({
      command: 'daytona',
      args: ['mcp', 'start'],
      env: {
        ...process.env,
        HOME: process.env.HOME || '',
        PATH: process.env.PATH || '',
      },
    })

    const client = new Client({
      name: 'pluto-app',
      version: '1.0.0',
    })

    await client.connect(transport)
    mcpClient = client

    console.log('Connected to Daytona MCP server')

    // List available tools for debugging
    const tools = await client.listTools()
    console.log('Available Daytona tools:', tools.tools.map((t) => t.name))

    return client
  } catch (error) {
    console.error('Failed to connect to Daytona MCP server:', error)
    throw error
  } finally {
    isConnecting = false
  }
}

/**
 * Call a Daytona MCP tool
 */
export async function callDaytonaTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const client = await getDaytonaMCPClient()

  const result = await client.callTool({
    name: toolName,
    arguments: args,
  })

  // Extract text content from result
  if ('content' in result && Array.isArray(result.content)) {
    const textContent = result.content.find((c) => c.type === 'text')
    if (textContent && 'text' in textContent) {
      try {
        return JSON.parse(textContent.text)
      } catch {
        return textContent.text
      }
    }
  }

  return result
}

// Daytona tool wrappers

export interface CreateSandboxResult {
  id: string
  state: string
}

export async function createSandbox(): Promise<CreateSandboxResult> {
  const result = await callDaytonaTool('create_sandbox', {
    language: 'typescript',
    region: 'eu',
  })
  console.log('create_sandbox result:', JSON.stringify(result, null, 2))

  // Result is a string like "Created new sandbox <id>"
  // Extract the ID from it
  if (typeof result === 'string') {
    const match = result.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
    if (match) {
      return { id: match[1], state: 'running' }
    }
  }

  // If it's already an object with id, use it
  if (result && typeof result === 'object' && 'id' in result) {
    return result as CreateSandboxResult
  }

  throw new Error(`Unexpected create_sandbox result: ${JSON.stringify(result)}`)
}

export async function deleteSandbox(sandboxId: string): Promise<void> {
  await callDaytonaTool('destroy_sandbox', { sandbox_id: sandboxId })
}

export async function runCommand(
  sandboxId: string,
  command: string,
  cwd?: string
): Promise<{ exitCode: number; output: string }> {
  const result = await callDaytonaTool('execute_command', {
    sandbox_id: sandboxId,
    command,
    cwd: cwd || '/app',
  })
  return result as { exitCode: number; output: string }
}

export async function writeFile(
  sandboxId: string,
  path: string,
  content: string
): Promise<void> {
  await callDaytonaTool('file_upload', {
    sandbox_id: sandboxId,
    path,
    content,
  })
}

export async function readFile(
  sandboxId: string,
  path: string
): Promise<string> {
  const result = await callDaytonaTool('file_download', {
    sandbox_id: sandboxId,
    path,
  })
  return result as string
}

export async function listFiles(
  sandboxId: string,
  path: string
): Promise<{ name: string; isDir: boolean }[]> {
  const result = await callDaytonaTool('list_files', {
    sandbox_id: sandboxId,
    path,
  })
  return result as { name: string; isDir: boolean }[]
}

export async function getPreviewUrl(
  sandboxId: string,
  port: number = 3000
): Promise<string> {
  const result = await callDaytonaTool('preview_link', {
    sandbox_id: sandboxId,
    port,
    expires_in_seconds: 3600, // 1 hour
  })
  return result as string
}

export async function gitClone(
  sandboxId: string,
  repoUrl: string,
  targetPath: string = '/app'
): Promise<void> {
  await callDaytonaTool('git_clone', {
    sandbox_id: sandboxId,
    url: repoUrl,
    path: targetPath,
  })
}
