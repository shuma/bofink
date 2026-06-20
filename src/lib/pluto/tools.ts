import { tool } from 'ai'
import { z } from 'zod'
import * as daytona from '@/lib/daytona/client'

// Create sandbox tools for a specific sandbox
export function createSandboxTools(sandboxId: string, appDir: string = '/home/daytona/app') {
  // Read file tool
  const readFile = tool({
    description: 'Read the contents of a file from the sandbox',
    inputSchema: z.object({
      path: z.string().describe(`The file path (e.g., "${appDir}/src/App.tsx")`),
    }),
    execute: async ({ path }) => {
      try {
        const content = await daytona.readFile(sandboxId, path)
        return { success: true, content }
      } catch (error) {
        return {
          success: false,
          error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    },
  })

  // Write file tool
  const writeFile = tool({
    description: 'Write content to a file in the sandbox. Creates the file if it does not exist.',
    inputSchema: z.object({
      path: z.string().describe(`The file path (e.g., "${appDir}/src/App.tsx")`),
      content: z.string().describe('The content to write to the file'),
    }),
    execute: async ({ path, content }) => {
      try {
        await daytona.writeFile(sandboxId, path, content)
        return { success: true, message: `File written: ${path}` }
      } catch (error) {
        return {
          success: false,
          error: `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    },
  })

  // List files tool
  const listFiles = tool({
    description: 'List files and directories in a path',
    inputSchema: z.object({
      path: z
        .string()
        .default(appDir)
        .describe(`The directory path (e.g., "${appDir}/src")`),
    }),
    execute: async ({ path }) => {
      try {
        const files = await daytona.listFiles(sandboxId, path || appDir)
        return {
          success: true,
          files: files.map((f) => ({
            name: f.name,
            isDirectory: f.isDir,
          })),
        }
      } catch (error) {
        return {
          success: false,
          error: `Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    },
  })

  // Run command tool
  const runCommand = tool({
    description: 'Execute a shell command in the sandbox. Use for npm install, npm run build, etc.',
    inputSchema: z.object({
      command: z
        .string()
        .describe('The command to run. For npm installs, always pass --legacy-peer-deps (e.g., "npm install axios --legacy-peer-deps").'),
      cwd: z
        .string()
        .optional()
        .describe(`Working directory (defaults to ${appDir})`),
    }),
    execute: async ({ command, cwd }) => {
      try {
        const result = await daytona.runCommand(sandboxId, command, cwd || appDir)
        return {
          success: result.exitCode === 0,
          exitCode: result.exitCode,
          output: result.output,
        }
      } catch (error) {
        return {
          success: false,
          error: `Failed to run command: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    },
  })

  // Ask user tool - NO execute function = human-in-the-loop
  const askUser = tool({
    description:
      'Ask the user a question when you need clarification or input. Use sparingly.',
    inputSchema: z.object({
      question: z.string().describe('The question to ask the user'),
      options: z
        .array(
          z.object({
            label: z.string().describe('Option label'),
            value: z.string().describe('Option value'),
          })
        )
        .optional()
        .describe('Optional predefined options for the user to choose from'),
      allowCustom: z
        .boolean()
        .optional()
        .describe('Whether to allow custom text input'),
    }),
    // No execute function - this triggers human-in-the-loop
  })

  return {
    readFile,
    writeFile,
    listFiles,
    runCommand,
    askUser,
  }
}

// Type for askUser tool arguments (for client-side handling)
export type AskUserArgs = {
  question: string
  options?: Array<{
    label: string
    value: string
  }>
  allowCustom?: boolean
}
