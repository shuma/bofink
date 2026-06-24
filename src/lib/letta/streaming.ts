/**
 * Letta Streaming Integration
 *
 * Uses the Letta client directly with client-side tools.
 * Converts Letta's streaming response to AI SDK's Data Stream Protocol
 * for compatibility with useChat() on the frontend.
 *
 * AI SDK Data Stream Protocol:
 * - 0: text delta (just the string)
 * - 9: tool call
 * - a: tool result
 * - d: finish message
 * - 3: error
 */

import { getLettaClient } from './client'
import type { ToolReturn, ApprovalCreate } from '@letta-ai/letta-client/resources/agents/messages'

interface ClientTool {
  name: string
  description: string
  parameters: Record<string, unknown>
}

interface ToolExecutor {
  (name: string, args: Record<string, unknown>): Promise<unknown>
}

export interface LettaStreamOptions {
  agentId: string
  userMessage: string
  systemPrompt?: string
  clientTools: ClientTool[]
  executeToolLocally: ToolExecutor
}

/**
 * Clear any pending approvals on the agent by fetching agent state
 * and auto-approving/denying pending tool calls.
 */
async function clearPendingApprovals(agentId: string): Promise<boolean> {
  const client = getLettaClient()
  if (!client) return false

  try {
    // Get agent state to check for pending approval
    const agent = await client.agents.retrieve(agentId, {
      include: ['agent.pending_approval'],
    })

    const pendingApproval = agent.pending_approval
    if (!pendingApproval) {
      console.log('[Letta] No pending approvals to clear')
      return false
    }

    console.log('[Letta] Found pending approval, auto-denying:', pendingApproval.id)

    // Get the tool call from the pending approval
    const toolCall = pendingApproval.tool_call
    if (!toolCall || !('id' in toolCall)) {
      console.log('[Letta] Pending approval has no valid tool call')
      return false
    }

    // Send an approval to clear the pending state (deny it to move forward)
    const approval: ApprovalCreate = {
      type: 'approval',
      approvals: [{
        tool_call_id: toolCall.id as string,
        status: 'error',
        tool_return: 'Previous request was interrupted. Please try again.',
      }],
    }

    // Send the approval via a non-streaming request
    await client.agents.messages.create(agentId, {
      messages: [approval] as any,
      streaming: false,
      max_steps: 1,
    })

    console.log('[Letta] Cleared pending approval')
    return true
  } catch (err) {
    console.error('[Letta] Error clearing pending approvals:', err)
    return false
  }
}

/**
 * Stream a message to Letta with client-side tool support.
 * Returns an AI SDK compatible streaming response.
 */
export async function streamWithLetta(options: LettaStreamOptions): Promise<Response> {
  const client = getLettaClient()
  if (!client) {
    throw new Error('Letta client not configured')
  }

  const { agentId, userMessage, systemPrompt, clientTools, executeToolLocally } = options

  // Create a TransformStream to convert Letta's format to AI SDK format
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  // Helper to write AI SDK formatted messages
  const writeText = async (text: string) => {
    // Format: 0:"text content"\n
    await writer.write(encoder.encode(`0:${JSON.stringify(text)}\n`))
  }

  const writeToolCall = async (toolCallId: string, toolName: string, args: unknown) => {
    // Format: 9:{"toolCallId":"...","toolName":"...","args":{...}}\n
    await writer.write(encoder.encode(`9:${JSON.stringify({ toolCallId, toolName, args })}\n`))
  }

  const writeToolResult = async (toolCallId: string, result: unknown) => {
    // Format: a:{"toolCallId":"...","result":...}\n
    await writer.write(encoder.encode(`a:${JSON.stringify({ toolCallId, result })}\n`))
  }

  const writeFinish = async (finishReason: string = 'stop') => {
    // Format: d:{"finishReason":"stop"}\n
    await writer.write(encoder.encode(`d:${JSON.stringify({ finishReason })}\n`))
  }

  const writeError = async (error: string) => {
    // Format: 3:"error message"\n
    await writer.write(encoder.encode(`3:${JSON.stringify(error)}\n`))
  }

  // Process in background
  ;(async () => {
    try {
      console.log('[Letta] Starting stream for agent:', agentId)
      console.log('[Letta] User message:', userMessage.slice(0, 100))
      console.log('[Letta] Client tools:', clientTools.map(t => t.name))

      // Clear any pending approvals before starting
      await clearPendingApprovals(agentId)

      let continueLoop = true
      let pendingToolReturns: ToolReturn[] = []
      let loopCount = 0
      const maxLoops = 20 // Prevent infinite loops

      while (continueLoop && loopCount < maxLoops) {
        loopCount++
        console.log(`[Letta] Loop ${loopCount}, pending returns: ${pendingToolReturns.length}`)

        // Build the request - either initial message or tool returns
        const messages: Array<{ role: 'user'; content: string } | { type: 'tool_return'; tool_returns: ToolReturn[] }> = []

        if (pendingToolReturns.length > 0) {
          // Send tool returns to continue the conversation
          messages.push({
            type: 'tool_return',
            tool_returns: pendingToolReturns,
          })
          pendingToolReturns = []
        } else {
          // Initial user message
          messages.push({
            role: 'user',
            content: userMessage,
          })
        }

        // Create streaming request with client tools
        console.log('[Letta] Sending request to Letta API...')
        const stream = await client.agents.messages.create(agentId, {
          messages: messages as any,
          client_tools: clientTools,
          override_system: systemPrompt,
          streaming: true,
          stream_tokens: true,
          max_steps: 50,
        })

        let needsToolExecution = false
        let receivedAnyMessage = false

        for await (const chunk of stream) {
          receivedAnyMessage = true
          const messageType = (chunk as { message_type?: string }).message_type
          console.log('[Letta] Received message type:', messageType)

          switch (messageType) {
            case 'assistant_message': {
              const content = (chunk as { content?: Array<{ type: string; text?: string }> | string }).content
              if (typeof content === 'string') {
                await writeText(content)
              } else if (Array.isArray(content)) {
                for (const part of content) {
                  if (part.type === 'text' && part.text) {
                    await writeText(part.text)
                  }
                }
              }
              break
            }

            case 'tool_call_message': {
              const toolCall = (chunk as {
                tool_call?: { id: string; name: string; arguments?: string }
              }).tool_call

              if (toolCall) {
                const toolName = toolCall.name
                const toolArgs = JSON.parse(toolCall.arguments || '{}')

                console.log(`[Letta] Tool call: ${toolName}`)

                // Notify frontend about tool call
                await writeToolCall(toolCall.id, toolName, toolArgs)

                // Check if this is a client-side tool
                const isClientTool = clientTools.some(t => t.name === toolName)

                if (isClientTool) {
                  // Execute tool locally
                  try {
                    console.log(`[Letta] Executing client tool: ${toolName}`)
                    const result = await executeToolLocally(toolName, toolArgs)
                    console.log(`[Letta] Tool result:`, typeof result)

                    // Queue tool return for next request
                    pendingToolReturns.push({
                      tool_call_id: toolCall.id,
                      status: 'success',
                      tool_return: typeof result === 'string' ? result : JSON.stringify(result),
                    })

                    // Notify frontend about tool result
                    await writeToolResult(toolCall.id, result)

                    needsToolExecution = true
                  } catch (err) {
                    console.error(`[Letta] Tool execution error:`, err)
                    const errorMsg = err instanceof Error ? err.message : 'Tool execution failed'
                    pendingToolReturns.push({
                      tool_call_id: toolCall.id,
                      status: 'error',
                      tool_return: errorMsg,
                    })
                    needsToolExecution = true
                  }
                }
              }
              break
            }

            case 'reasoning_message': {
              const content = (chunk as { content?: string }).content
              if (content) {
                // Stream reasoning as text
                await writeText(`\n[Thinking: ${content}]\n`)
              }
              break
            }

            case 'error_message': {
              const errorMsg = (chunk as { message?: string }).message || 'Unknown error'
              console.error('[Letta] Error message:', errorMsg)
              await writeError(errorMsg)
              continueLoop = false
              break
            }

            case 'usage_statistics': {
              // Log usage stats
              const usage = chunk as { prompt_tokens?: number; completion_tokens?: number }
              console.log('[Letta] Usage:', usage)
              break
            }

            case 'stop_reason': {
              // Letta indicates conversation is done
              console.log('[Letta] Stop reason received')
              continueLoop = false
              break
            }

            case 'ping':
              // Ignore keepalive
              break

            default:
              // Log unknown message types for debugging
              if (messageType) {
                console.log('[Letta] Unknown message type:', messageType, JSON.stringify(chunk).slice(0, 200))
              }
          }
        }

        console.log(`[Letta] Stream iteration done. needsToolExecution: ${needsToolExecution}, pendingReturns: ${pendingToolReturns.length}`)

        // If we didn't receive any messages, something is wrong
        if (!receivedAnyMessage) {
          console.warn('[Letta] No messages received from stream')
          continueLoop = false
        }

        // If we need to send tool returns, continue the loop
        if (!needsToolExecution || pendingToolReturns.length === 0) {
          continueLoop = false
        }
      }

      // Send finish message
      console.log('[Letta] Sending finish message')
      await writeFinish('stop')

    } catch (error) {
      console.error('[Letta] Stream error:', error)
      await writeError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      console.log('[Letta] Closing writer')
      await writer.close()
    }
  })()

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

/**
 * Convert Daytona sandbox tools to Letta client tools format.
 */
export function convertToClientTools(
  tools: Record<string, { description: string; inputSchema: unknown }>
): { name: string; description: string; parameters: Record<string, unknown> }[] {
  return Object.entries(tools).map(([name, tool]) => ({
    name,
    description: tool.description,
    parameters: tool.inputSchema as Record<string, unknown>,
  }))
}
