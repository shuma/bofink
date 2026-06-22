'use client'

import { useState, useRef, useEffect } from 'react'
import {
  FileText,
  Globe,
  SquareTerminal,
  RefreshCw,
  ExternalLink,
  AppWindow,
  Mic,
  ChevronDown,
} from 'lucide-react'
import { PreviewFrame } from './preview-frame'
import { BuildLog } from './build-log'
import { AskUserModal } from './ask-user-modal'
import { StatusCard } from './status-card'
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
  PromptInputActionAddScreenshot,
  PromptInputButton,
  PromptInputSubmit,
} from '@/components/ai-elements/prompt-input'
import { SplitPanelLayout } from '@/components/layouts'
import { cn } from '@/lib/utils'
import type { BuildLogEntry, AskUserRequest, Project } from '@/types/pluto'
import type { UIMessage } from 'ai'

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${day} at ${time}`
}

interface BuildWorkspaceProps {
  project: Project
  messages: UIMessage[]
  isBuilding: boolean
  onSendMessage: (message: string) => void
  onStop: () => void
  onAskUserResponse: (response: string) => void
  askUserRequest: AskUserRequest | null
}

export function BuildWorkspace({
  project,
  messages,
  isBuilding,
  onSendMessage,
  onStop,
  onAskUserResponse,
  askUserRequest,
}: BuildWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'logs'>('preview')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const handlePreviewRefresh = () => setPreviewKey((k) => k + 1)
  const handleOpenExternal = () => {
    if (previewUrl) window.open(previewUrl, '_blank')
  }

  // Fetch fresh preview URL when project has a sandbox and isn't building
  useEffect(() => {
    async function fetchPreviewUrl() {
      if (!project.daytona_sandbox_id || isBuilding) {
        setPreviewUrl(null)
        return
      }

      setPreviewLoading(true)
      try {
        const res = await fetch(`/api/projects/${project.id}/preview`)
        if (res.ok) {
          const data = await res.json()
          setPreviewUrl(data.url)
        }
      } catch (err) {
        console.error('Failed to fetch preview URL:', err)
      } finally {
        setPreviewLoading(false)
      }
    }

    fetchPreviewUrl()
  }, [project.id, project.daytona_sandbox_id, isBuilding, project.status])

  // Build logs from messages
  const buildLogs: BuildLogEntry[] = messages
    .filter((m) => m.role === 'assistant')
    .flatMap((m) => {
      const logs: BuildLogEntry[] = []

      // Parse parts
      if (m.parts) {
        m.parts.forEach((part, partIndex) => {
          // Handle text parts
          if (part.type === 'text' && 'text' in part) {
            logs.push({
              id: `${m.id}-${partIndex}-text`,
              timestamp: new Date().toISOString(),
              type: 'info',
              message: part.text,
            })
          }

          // Handle tool parts (new v6 structure)
          if ('toolCallId' in part) {
            const toolPart = part as {
              toolCallId: string
              type?: string
              state?: string
              input?: Record<string, unknown>
              output?: Record<string, unknown>
            }

            // Get tool name from type (e.g., "tool-runCommand")
            const toolName = toolPart.type?.replace('tool-', '') || 'tool'

            if (toolName === 'runCommand' && toolPart.input?.command) {
              logs.push({
                id: `${m.id}-${partIndex}-cmd`,
                timestamp: new Date().toISOString(),
                type: 'command',
                message: `$ ${toolPart.input.command}`,
              })
            } else if (toolName === 'writeFile' && toolPart.input?.path) {
              logs.push({
                id: `${m.id}-${partIndex}-write`,
                timestamp: new Date().toISOString(),
                type: 'info',
                message: `Writing file: ${toolPart.input.path}`,
              })
            } else if (toolName === 'readFile' && toolPart.input?.path) {
              logs.push({
                id: `${m.id}-${partIndex}-read`,
                timestamp: new Date().toISOString(),
                type: 'info',
                message: `Reading file: ${toolPart.input.path}`,
              })
            }

            // Add output if available
            if (toolPart.output) {
              if (toolPart.output.success === false) {
                logs.push({
                  id: `${m.id}-${partIndex}-error`,
                  timestamp: new Date().toISOString(),
                  type: 'error',
                  message: String(toolPart.output.error || 'Operation failed'),
                })
              } else if (toolPart.output.output) {
                const output = String(toolPart.output.output)
                if (output.length > 0) {
                  logs.push({
                    id: `${m.id}-${partIndex}-output`,
                    timestamp: new Date().toISOString(),
                    type: 'output',
                    message: output.slice(0, 500),
                  })
                }
              }
            }
          }
        })
      }

      return logs
    })

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Get display content from message
  const getMessageContent = (message: UIMessage): string => {
    // Extract text from parts
    const textParts = message.parts?.filter(
      (part): part is { type: 'text'; text: string } =>
        part.type === 'text' && 'text' in part
    )

    if (!textParts || textParts.length === 0) return ''

    // For the assistant, the model narrates each step as a separate text part
    // (between tool calls). Showing all of them floods the chat, and the full
    // step-by-step detail is already in the Build Logs panel. So we only show
    // the latest segment as a concise status/summary line.
    if (message.role === 'assistant') {
      return textParts[textParts.length - 1].text
    }

    return textParts.map((p) => p.text).join('\n')
  }

  return (
    <SplitPanelLayout>
      {/* Left side - Chat */}
      <SplitPanelLayout.Left>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 scrollbar-none">
          {/* Timestamp divider */}
          <p className="text-center text-xs text-muted-foreground/70">
            {formatTimestamp(project.created_at)}
          </p>

          {messages.map((message, index) => {
            const content = getMessageContent(message)
            // Skip empty bubbles (e.g. assistant turns that are only tool calls)
            if (!content.trim()) return null

            // User turns sit in a warm cream bubble.
            if (message.role === 'user') {
              return (
                <div
                  key={`${message.id}-${index}`}
                  className="rounded-2xl bg-secondary px-4 py-3"
                >
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                    {content}
                  </p>
                </div>
              )
            }

            // Assistant turns render as an action card: a label, the narration,
            // and a plan reference when the project carries one.
            return (
              <div
                key={`${message.id}-${index}`}
                className="rounded-2xl border border-border/70 bg-card p-3.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    Edited
                  </span>
                  <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                    index.tsx
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {content}
                </p>
                {project.plan?.name && (
                  <div className="mt-2.5 flex items-center gap-2 border-t border-border/60 pt-2.5 text-sm text-muted-foreground">
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      <span className="font-medium text-foreground">Plan:</span>{' '}
                      {project.plan.name}
                    </span>
                  </div>
                )}
              </div>
            )
          })}

          {isBuilding && <StatusCard label="Building…" />}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 pb-4">
          <PromptInput
            variant="chatbar"
            onSubmit={({ text }) => {
              if (text.trim() && !isBuilding) {
                onSendMessage(text.trim())
              }
            }}
          >
            <PromptInputTextarea
              placeholder={isBuilding ? 'Building...' : 'Ask Pluto...'}
              disabled={isBuilding}
              className="min-h-14 px-5 py-4 text-sm placeholder:text-muted-foreground/50"
            />
            <PromptInputFooter className="px-2.5 pb-2.5">
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger
                    size="icon-md"
                    aria-label="Attach"
                    className="border border-border/70 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments />
                    <PromptInputActionAddScreenshot />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
              </PromptInputTools>
              <PromptInputTools className="gap-0.5">
                <PromptInputButton
                  size="sm"
                  className="text-foreground hover:bg-muted/50"
                >
                  Build
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </PromptInputButton>
                <PromptInputButton
                  size="icon-md"
                  aria-label="Voice input"
                  className="text-muted-foreground/70 hover:text-muted-foreground"
                >
                  <Mic className="size-4" />
                </PromptInputButton>
                <PromptInputSubmit
                  status={isBuilding ? 'streaming' : 'ready'}
                  onStop={onStop}
                  size="icon-md"
                  variant="ghost"
                  className="bg-foreground/80 text-background hover:bg-foreground/70 disabled:bg-muted disabled:text-muted-foreground"
                />
              </PromptInputTools>
            </PromptInputFooter>
          </PromptInput>
        </div>
      </SplitPanelLayout.Left>

      {/* Right side - Preview/Logs */}
      <SplitPanelLayout.Right>
        {/* Menubar */}
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div className="view-switcher-track inline-flex items-center gap-0.5 rounded-full p-0.5">
            <button
              onClick={() => setActiveTab('preview')}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium transition-colors',
                activeTab === 'preview'
                  ? 'view-switcher-pill text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Globe className="h-3.5 w-3.5" />
              Preview
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium transition-colors',
                activeTab === 'logs'
                  ? 'view-switcher-pill text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <SquareTerminal className="h-3.5 w-3.5" />
              Build Logs
            </button>
          </div>

          {/* URL + preview controls (preview tab only) */}
          {activeTab === 'preview' && previewUrl && (
            <div className="ml-auto flex min-w-0 items-center gap-0.5">
              <div className="flex min-w-0 max-w-[18rem] items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-[11px] text-muted-foreground">
                <AppWindow className="h-3 w-3 shrink-0" />
                <span className="truncate">{previewUrl}</span>
              </div>
              <button
                type="button"
                onClick={handlePreviewRefresh}
                aria-label="Reload preview"
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleOpenExternal}
                aria-label="Open in new tab"
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-3 pb-3">
          {activeTab === 'preview' ? (
            <PreviewFrame
              url={previewUrl}
              isLoading={isBuilding || previewLoading}
              refreshKey={previewKey}
              className="h-full"
            />
          ) : (
            <BuildLog logs={buildLogs} className="h-full max-h-full" />
          )}
        </div>
      </SplitPanelLayout.Right>

      {/* Ask User Modal */}
      <AskUserModal
        request={askUserRequest}
        onSubmit={onAskUserResponse}
        onCancel={() => onAskUserResponse('')}
      />
    </SplitPanelLayout>
  )
}
