import { tool } from 'ai'
import { z } from 'zod'
import * as daytona from '@/lib/daytona/client'
import * as ops from '@/lib/daytona/operations'
import * as state from '@/lib/daytona/state'
import { buildProjectContext, formatContextForLLM, summarizeFileWithLLM } from './summarizer'
import {
  updateProjectSummary,
  upsertFileSummary,
} from '@/lib/memory'

// Create sandbox tools for a specific sandbox
export function createSandboxTools(
  sandboxId: string,
  appDir: string = '/home/daytona/app',
  projectId?: string
) {
  // ============================================================================
  // File Reading (Enhanced with line ranges)
  // ============================================================================

  const readFile = tool({
    description: 'Read file contents from the sandbox. Supports line ranges for large files.',
    inputSchema: z.object({
      path: z.string().describe(`The file path (e.g., "${appDir}/src/App.tsx")`),
      startLine: z.number().optional().describe('Start line (1-indexed, inclusive). Omit to read from beginning.'),
      endLine: z.number().optional().describe('End line (1-indexed, inclusive). Omit to read to end.'),
    }),
    execute: async ({ path, startLine, endLine }) => {
      try {
        if (startLine !== undefined || endLine !== undefined) {
          // Use line-range reading
          const result = await ops.readFileWithLines(sandboxId, path, { startLine, endLine })
          return {
            success: true,
            content: result.content,
            totalLines: result.totalLines,
            startLine: result.startLine,
            endLine: result.endLine,
            wasTruncated: result.wasTruncated,
          }
        }

        // Full file read with truncation
        const content = await daytona.readFile(sandboxId, path)
        const truncated = ops.truncateOutput(content, { maxLines: 500 })

        return {
          success: true,
          content: truncated.content,
          totalLines: content.split('\n').length,
          wasTruncated: truncated.wasTruncated,
        }
      } catch (error) {
        return {
          success: false,
          error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    },
  })

  // ============================================================================
  // File Writing
  // ============================================================================

  const writeFile = tool({
    description: 'Write content to a file in the sandbox. Creates the file if it does not exist.',
    inputSchema: z.object({
      path: z.string().describe(`The file path (e.g., "${appDir}/src/App.tsx")`),
      content: z.string().describe('The content to write to the file'),
    }),
    execute: async ({ path, content }) => {
      try {
        await daytona.writeFile(sandboxId, path, content)
        // Track file modification
        await state.recordFileModification(sandboxId, path, 'modified').catch(() => {})
        return { success: true, message: `File written: ${path}` }
      } catch (error) {
        return {
          success: false,
          error: `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    },
  })

  // ============================================================================
  // File Editing (Patch-based)
  // ============================================================================

  const editFile = tool({
    description: 'Edit specific lines in a file using patches. More efficient than rewriting entire files.',
    inputSchema: z.object({
      path: z.string().describe('The file path to edit'),
      edits: z.array(z.object({
        startLine: z.number().describe('Start line to replace (1-indexed)'),
        endLine: z.number().describe('End line to replace (1-indexed, inclusive)'),
        content: z.string().describe('New content to insert'),
      })).describe('Array of edits to apply'),
      createIfMissing: z.boolean().optional().describe('Create the file if it does not exist'),
    }),
    execute: async ({ path, edits, createIfMissing }) => {
      try {
        const result = await ops.editFile(sandboxId, path, { edits, createIfMissing })
        await state.recordFileModification(sandboxId, path, 'modified').catch(() => {})
        return {
          success: true,
          message: `Edited ${result.linesModified} lines in ${path}`,
          totalLines: result.totalLines,
        }
      } catch (error) {
        return {
          success: false,
          error: `Failed to edit file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    },
  })

  // ============================================================================
  // File Operations
  // ============================================================================

  const deleteFile = tool({
    description: 'Delete a file from the sandbox',
    inputSchema: z.object({
      path: z.string().describe('The file path to delete'),
    }),
    execute: async ({ path }) => {
      try {
        await ops.deleteFile(sandboxId, path)
        await state.recordFileModification(sandboxId, path, 'deleted').catch(() => {})
        return { success: true, message: `Deleted: ${path}` }
      } catch (error) {
        return {
          success: false,
          error: `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    },
  })

  const moveFile = tool({
    description: 'Move or rename a file in the sandbox',
    inputSchema: z.object({
      from: z.string().describe('Source path'),
      to: z.string().describe('Destination path'),
    }),
    execute: async ({ from, to }) => {
      try {
        await ops.moveFile(sandboxId, from, to)
        await state.recordFileModification(sandboxId, from, 'deleted').catch(() => {})
        await state.recordFileModification(sandboxId, to, 'created').catch(() => {})
        return { success: true, message: `Moved ${from} to ${to}` }
      } catch (error) {
        return {
          success: false,
          error: `Failed to move file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    },
  })

  // ============================================================================
  // List Files
  // ============================================================================

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

  // ============================================================================
  // Search Operations
  // ============================================================================

  const searchFiles = tool({
    description: 'Search for files by name pattern (glob)',
    inputSchema: z.object({
      pattern: z.string().describe('Glob pattern (e.g., "*.tsx", "Button*")'),
      path: z.string().optional().describe(`Directory to search (defaults to ${appDir})`),
      maxResults: z.number().optional().describe('Max results to return (default: 50)'),
    }),
    execute: async ({ pattern, path, maxResults }) => {
      try {
        const result = await ops.searchFiles(sandboxId, {
          pattern,
          path: path || appDir,
          maxResults,
        })
        return {
          success: true,
          files: result.files,
          totalFound: result.totalFound,
          wasTruncated: result.wasTruncated,
        }
      } catch (error) {
        return {
          success: false,
          error: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    },
  })

  const grep = tool({
    description: 'Search file contents using regex pattern',
    inputSchema: z.object({
      pattern: z.string().describe('Regex pattern to search for'),
      path: z.string().describe('File or directory to search'),
      contextLines: z.number().optional().describe('Lines of context before/after match'),
      ignoreCase: z.boolean().optional().describe('Case insensitive search'),
      maxMatches: z.number().optional().describe('Max matches to return (default: 50)'),
    }),
    execute: async ({ pattern, path, contextLines, ignoreCase, maxMatches }) => {
      try {
        const result = await ops.grep(sandboxId, {
          pattern,
          path,
          contextLines,
          ignoreCase,
          maxMatches,
        })
        return {
          success: true,
          matches: result.matches,
          totalMatches: result.totalMatches,
          wasTruncated: result.wasTruncated,
        }
      } catch (error) {
        return {
          success: false,
          error: `Grep failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    },
  })

  // ============================================================================
  // File Tree Navigation
  // ============================================================================

  const getFileTree = tool({
    description: 'Get the file tree structure of the project',
    inputSchema: z.object({
      path: z.string().optional().describe(`Root path (defaults to ${appDir})`),
      depth: z.number().optional().describe('Max depth (default: 3)'),
      includeSize: z.boolean().optional().describe('Include file sizes'),
    }),
    execute: async ({ path, depth, includeSize }) => {
      try {
        const tree = await ops.getFileTree(sandboxId, {
          path: path || appDir,
          depth,
          includeSize,
        })
        return { success: true, tree }
      } catch (error) {
        return {
          success: false,
          error: `Failed to get file tree: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    },
  })

  const detectProjectType = tool({
    description: 'Detect the project type, framework, and package manager',
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const info = await ops.detectProjectType(sandboxId, appDir)
        return { success: true, ...info }
      } catch (error) {
        return {
          success: false,
          error: `Detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    },
  })

  // ============================================================================
  // Command Execution
  // ============================================================================

  const runCommand = tool({
    description: 'Execute a shell command in the sandbox. Use for npm install, npm run build, etc.',
    inputSchema: z.object({
      command: z
        .string()
        .describe('The command to run. For npm installs, always pass --legacy-peer-deps.'),
      cwd: z
        .string()
        .optional()
        .describe(`Working directory (defaults to ${appDir})`),
      timeout: z.number().optional().describe('Timeout in seconds (default: 120)'),
    }),
    execute: async ({ command, cwd, timeout }) => {
      try {
        const result = await daytona.runCommand(sandboxId, command, cwd || appDir, timeout)
        const truncated = ops.truncateOutput(result.output)

        return {
          success: result.exitCode === 0,
          exitCode: result.exitCode,
          output: truncated.content,
          wasTruncated: truncated.wasTruncated,
        }
      } catch (error) {
        return {
          success: false,
          error: `Failed to run command: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    },
  })

  // ============================================================================
  // Process Management
  // ============================================================================

  const startProcess = tool({
    description: 'Start a background process (e.g., dev server)',
    inputSchema: z.object({
      command: z.string().describe('Command to run'),
      cwd: z.string().optional().describe('Working directory'),
      sessionId: z.string().optional().describe('Session ID for the process'),
    }),
    execute: async ({ command, cwd, sessionId }) => {
      try {
        const id = await ops.startProcess(sandboxId, command, { cwd, sessionId })
        return { success: true, sessionId: id }
      } catch (error) {
        return {
          success: false,
          error: `Failed to start process: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    },
  })

  const stopProcess = tool({
    description: 'Stop a running background process',
    inputSchema: z.object({
      sessionId: z.string().describe('Session ID of the process to stop'),
    }),
    execute: async ({ sessionId }) => {
      try {
        await ops.stopProcess(sandboxId, sessionId)
        return { success: true, message: `Stopped process: ${sessionId}` }
      } catch (error) {
        return {
          success: false,
          error: `Failed to stop process: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    },
  })

  const listProcesses = tool({
    description: 'List running processes in the sandbox',
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const processes = await ops.listProcesses(sandboxId)
        return { success: true, processes }
      } catch (error) {
        return {
          success: false,
          error: `Failed to list processes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    },
  })

  const getLogs = tool({
    description: 'Get logs from a process or the dev server',
    inputSchema: z.object({
      sessionId: z.string().optional().describe('Process session ID'),
      logFile: z.string().optional().describe('Log file path'),
      lines: z.number().optional().describe('Number of lines to return (default: 100)'),
    }),
    execute: async ({ sessionId, logFile, lines }) => {
      try {
        const logs = await ops.getLogs(sandboxId, { sessionId, logFile, lines })
        const truncated = ops.truncateOutput(logs)
        return {
          success: true,
          logs: truncated.content,
          wasTruncated: truncated.wasTruncated,
        }
      } catch (error) {
        return {
          success: false,
          error: `Failed to get logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    },
  })

  // ============================================================================
  // Checkpoint Management
  // ============================================================================

  const createCheckpoint = tool({
    description: 'Create a checkpoint of the current project state for rollback',
    inputSchema: z.object({
      label: z.string().describe('Unique label for the checkpoint (e.g., "before-refactor")'),
    }),
    execute: async ({ label }) => {
      try {
        const checkpoint = await ops.createCheckpoint(sandboxId, appDir, label)
        await state.recordCheckpoint(sandboxId, label).catch(() => {})
        return {
          success: true,
          checkpoint,
          message: `Checkpoint "${label}" created`,
        }
      } catch (error) {
        return {
          success: false,
          error: `Failed to create checkpoint: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    },
  })

  const rollbackCheckpoint = tool({
    description: 'Rollback to a previous checkpoint',
    inputSchema: z.object({
      label: z.string().describe('Label of the checkpoint to rollback to'),
    }),
    execute: async ({ label }) => {
      try {
        await ops.rollbackCheckpoint(sandboxId, appDir, label)
        return { success: true, message: `Rolled back to checkpoint "${label}"` }
      } catch (error) {
        return {
          success: false,
          error: `Failed to rollback: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    },
  })

  const getDiff = tool({
    description: 'Get diff of changes since a checkpoint or last commit',
    inputSchema: z.object({
      checkpointLabel: z.string().optional().describe('Compare against this checkpoint'),
    }),
    execute: async ({ checkpointLabel }) => {
      try {
        const diff = await ops.getDiff(sandboxId, appDir, checkpointLabel)
        return { success: true, diff }
      } catch (error) {
        return {
          success: false,
          error: `Failed to get diff: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    },
  })

  // ============================================================================
  // Build/Test Operations
  // ============================================================================

  const runTests = tool({
    description: 'Run the project test suite',
    inputSchema: z.object({
      command: z.string().optional().describe('Test command (auto-detected if not provided)'),
    }),
    execute: async ({ command }) => {
      try {
        const result = await ops.runTests(sandboxId, appDir, command)
        return {
          success: result.success,
          exitCode: result.exitCode,
          output: result.output,
        }
      } catch (error) {
        return {
          success: false,
          error: `Tests failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    },
  })

  const formatCode = tool({
    description: 'Format code using prettier',
    inputSchema: z.object({
      command: z.string().optional().describe('Format command (defaults to prettier)'),
    }),
    execute: async ({ command }) => {
      try {
        const result = await ops.formatCode(sandboxId, appDir, command)
        return { success: result.success, output: result.output }
      } catch (error) {
        return {
          success: false,
          error: `Format failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    },
  })

  const installDependencies = tool({
    description: 'Install npm/yarn/bun dependencies',
    inputSchema: z.object({
      packages: z.array(z.string()).optional().describe('Specific packages to install'),
    }),
    execute: async ({ packages }) => {
      try {
        const result = await ops.installDependencies(sandboxId, appDir, packages)
        return { success: result.success, output: result.output }
      } catch (error) {
        return {
          success: false,
          error: `Install failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    },
  })

  // ============================================================================
  // Preview & Summary Tools
  // ============================================================================

  const previewUrl = tool({
    description: 'Get the preview URL for the running dev server',
    inputSchema: z.object({
      port: z.number().optional().describe('Port number (default: 3000)'),
    }),
    execute: async ({ port = 3000 }) => {
      try {
        const url = await daytona.getPreviewUrl(sandboxId, port)
        return { success: true, url }
      } catch (error) {
        return {
          success: false,
          error: `Failed to get preview URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    },
  })

  const summarizeProject = tool({
    description: 'Generate a summary of the project structure and purpose. Stores the summary in database memory for future context.',
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const context = await buildProjectContext(sandboxId, appDir)
        const formattedSummary = formatContextForLLM(context)

        // Store in database memory if projectId is provided
        if (projectId) {
          await updateProjectSummary(projectId, formattedSummary).catch((err) => {
            console.warn('[summarizeProject] Failed to store summary in memory:', err)
          })
        }

        return {
          success: true,
          summary: formattedSummary,
          components: context.summary.components.length,
          pages: context.summary.pages.length,
          hooks: context.summary.hooks.length,
        }
      } catch (error) {
        return {
          success: false,
          error: `Failed to summarize project: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    },
  })

  const summarizeFile = tool({
    description: 'Generate an AI-powered summary of a specific file, including its purpose, key functions, and dependencies.',
    inputSchema: z.object({
      path: z.string().describe('Path to the file to summarize'),
    }),
    execute: async ({ path }) => {
      try {
        const summary = await summarizeFileWithLLM(sandboxId, path)

        // Store in database memory if projectId is provided
        if (projectId) {
          await upsertFileSummary(projectId, path, {
            summary: summary.aiSummary,
            file_type: summary.type,
            exports: summary.exports,
            imports: summary.imports,
            line_count: summary.lineCount,
            content_hash: summary.hash,
          }).catch((err) => {
            console.warn('[summarizeFile] Failed to store file summary in memory:', err)
          })
        }

        return {
          success: true,
          path: summary.path,
          type: summary.type,
          purpose: summary.purpose,
          aiSummary: summary.aiSummary,
          keyFunctions: summary.keyFunctions,
          exports: summary.exports,
          dependencies: summary.dependencies,
          lineCount: summary.lineCount,
        }
      } catch (error) {
        return {
          success: false,
          error: `Failed to summarize file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    },
  })

  // ============================================================================
  // Human-in-the-loop
  // ============================================================================

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
    // Basic file operations
    readFile,
    writeFile,
    editFile,
    deleteFile,
    moveFile,
    listFiles,

    // Search
    searchFiles,
    grep,

    // Navigation
    getFileTree,
    detectProjectType,

    // Commands
    runCommand,

    // Process management
    startProcess,
    stopProcess,
    listProcesses,
    getLogs,

    // Checkpoints
    createCheckpoint,
    rollbackCheckpoint,
    getDiff,

    // Build/Test
    runTests,
    formatCode,
    installDependencies,

    // Preview & Summary
    previewUrl,
    summarizeProject,
    summarizeFile,

    // Human-in-the-loop
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

/**
 * Raw tool definition for use with Letta or other providers
 */
export interface RawToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
  execute: (args: Record<string, unknown>) => Promise<unknown>
}

/**
 * Create raw sandbox tools (not wrapped with AI SDK tool())
 * Used for Letta client-side tools integration
 */
export function createSandboxToolsRaw(
  sandboxId: string,
  appDir: string = '/home/daytona/app'
): Record<string, RawToolDefinition> {
  // Get the AI SDK tools
  const aiTools = createSandboxTools(sandboxId, appDir)

  // Extract raw definitions from each tool
  const rawTools: Record<string, RawToolDefinition> = {}

  for (const [name, aiTool] of Object.entries(aiTools)) {
    // AI SDK v6 tools have: description, inputSchema (Zod), execute
    const toolDef = aiTool as {
      description?: string
      inputSchema?: { toJSONSchema?: () => Record<string, unknown> }
      execute?: (args: unknown) => Promise<unknown>
    }

    // Convert Zod schema to JSON schema using Zod v4's built-in method
    let jsonSchema: Record<string, unknown> = { type: 'object', properties: {} }
    if (toolDef.inputSchema?.toJSONSchema) {
      jsonSchema = toolDef.inputSchema.toJSONSchema()
      // Remove $schema property as Letta may not expect it
      delete jsonSchema['$schema']
    }

    rawTools[name] = {
      name,
      description: toolDef.description || `Tool: ${name}`,
      parameters: jsonSchema,
      execute: async (args: Record<string, unknown>) => {
        if (toolDef.execute) {
          return toolDef.execute(args)
        }
        throw new Error(`Tool ${name} has no execute function`)
      },
    }
  }

  return rawTools
}
