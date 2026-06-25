'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  FileText,
  Globe,
  Mic,
  ChevronDown,
  Code,
  Layers,
  X,
  RefreshCw,
  ExternalLink,
  AppWindow,
} from 'lucide-react'
import { PreviewPanel } from './preview-panel'
import { LogsPanel } from './logs-panel'
import { CodePanel } from './code-panel'
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
import { usePreviewUrl } from '@/hooks/use-preview-url'
import { useBuildLogs } from '@/hooks/use-build-logs'
import type { AskUserRequest, Project, LineSelection } from '@/types/pluto'
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
  onBack?: () => void
}

export function BuildWorkspace({
  project,
  messages,
  isBuilding,
  onSendMessage,
  onStop,
  onAskUserResponse,
  askUserRequest,
  onBack,
}: BuildWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'logs' | 'code'>('preview')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [lineSelection, setLineSelection] = useState<LineSelection | null>(null)
  const [previewKey, setPreviewKey] = useState(0)

  // Preview URL
  const { data: previewUrl } = usePreviewUrl(
    project.id,
    project.daytona_sandbox_id,
    isBuilding
  )

  const handleRefreshPreview = useCallback(() => {
    setPreviewKey((k) => k + 1)
  }, [])

  const handleOpenExternal = useCallback(() => {
    if (previewUrl) window.open(previewUrl, '_blank')
  }, [previewUrl])

  // Handle line selection from CodePanel
  const handleLineSelection = useCallback((selection: LineSelection | null) => {
    setLineSelection(selection)
  }, [])

  // Clear line selection
  const clearLineSelection = useCallback(() => {
    setLineSelection(null)
  }, [])

  // Format message with line reference
  const formatMessageWithLineRef = useCallback(
    (text: string): string => {
      if (!lineSelection) return text
      const lineRef =
        lineSelection.startLine === lineSelection.endLine
          ? `[${lineSelection.fileName}:${lineSelection.startLine}]`
          : `[${lineSelection.fileName}:${lineSelection.startLine}-${lineSelection.endLine}]`
      return `${lineRef} ${text}`
    },
    [lineSelection]
  )

  // Fetch build logs from API - only when logs tab is visible
  const { data: buildLogs = [] } = useBuildLogs(project.id, {
    isVisible: activeTab === 'logs',
    isBuilding,
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
        {/* Project Header */}
        <div className="shrink-0 px-3 py-2.5">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="group flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-muted"
              aria-label="Back to projects"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary font-heading text-xs font-semibold text-primary-foreground">
                {project.name.charAt(0).toUpperCase()}
              </span>
              <span className="truncate font-heading text-sm font-medium">
                {project.name}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="relative flex-1 overflow-hidden">
          {/* Top fade */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-background to-transparent" />

          {/* Bottom fade */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-background to-transparent" />

          <div className="h-full overflow-y-auto px-4 py-5 space-y-4 scrollbar-none">
            {/* Timestamp divider */}
            <p className="text-center text-xs text-muted-foreground/70" suppressHydrationWarning>
              {formatTimestamp(project.created_at)}
            </p>

          {messages.map((message, index) => {
            const content = getMessageContent(message)
            // Skip empty bubbles (e.g. assistant turns that are only tool calls)
            if (!content.trim()) return null

            // User message bubble
            if (message.role === 'user') {
              return (
                <div
                  key={`${message.id}-${index}`}
                  className="rounded-2xl border border-border/60 bg-muted/30 px-5 py-4"
                >
                  <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">
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
        </div>

        {/* Input */}
        <div className="px-4 pt-2 pb-4">
          {/* Line selection badge */}
          {lineSelection && (
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-100 px-2 py-1 text-xs text-blue-700">
                <Code className="h-3 w-3" />
                {lineSelection.fileName}:
                {lineSelection.startLine === lineSelection.endLine
                  ? lineSelection.startLine
                  : `${lineSelection.startLine}-${lineSelection.endLine}`}
                <button
                  onClick={clearLineSelection}
                  className="ml-0.5 rounded hover:bg-blue-200"
                  aria-label="Clear line selection"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            </div>
          )}
          <PromptInput
            variant="chatbar"
            onSubmit={({ text }) => {
              if (text.trim() && !isBuilding) {
                const message = formatMessageWithLineRef(text.trim())
                onSendMessage(message)
                clearLineSelection()
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

      {/* Right side - Preview/Logs/Code */}
      <SplitPanelLayout.Right>
        {/* Menubar */}
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div className="view-switcher-track inline-flex items-center rounded-full">
            <button
              onClick={() => setActiveTab('preview')}
              className={cn(
                'flex items-center justify-center rounded-full text-xs font-medium transition-all',
                activeTab === 'preview'
                  ? 'view-switcher-pill gap-1.5 h-6 px-2'
                  : 'h-6 w-6 text-muted-foreground hover:text-foreground'
              )}
              aria-label="Preview"
            >
              <Globe className="h-3.5 w-3.5 shrink-0" />
              {activeTab === 'preview' && <span>Preview</span>}
            </button>
            {activeTab !== 'preview' && activeTab !== 'logs' && (
              <div className="view-switcher-divider" />
            )}
            <button
              onClick={() => setActiveTab('logs')}
              className={cn(
                'flex items-center justify-center rounded-full text-xs font-medium transition-all',
                activeTab === 'logs'
                  ? 'view-switcher-pill gap-1.5 h-6 px-2'
                  : 'h-6 w-6 text-muted-foreground hover:text-foreground'
              )}
              aria-label="Build Logs"
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              {activeTab === 'logs' && <span>Build Logs</span>}
            </button>
            {activeTab !== 'logs' && activeTab !== 'code' && (
              <div className="view-switcher-divider" />
            )}
            <button
              onClick={() => setActiveTab('code')}
              className={cn(
                'flex items-center justify-center rounded-full text-xs font-medium transition-all',
                activeTab === 'code'
                  ? 'view-switcher-pill gap-1.5 h-6 px-2'
                  : 'h-6 w-6 text-muted-foreground hover:text-foreground'
              )}
              aria-label="Code"
            >
              <Code className="h-3.5 w-3.5 shrink-0" />
              {activeTab === 'code' && <span>Code</span>}
            </button>
            {activeTab !== 'code' && (
              <div className="view-switcher-divider" />
            )}
            <button
              className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Layers"
            >
              <Layers className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* URL bar - only show when preview tab is active */}
          {activeTab === 'preview' && previewUrl && (
            <div className="flex min-w-0 flex-1 items-center gap-1">
              <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1 text-[11px] text-muted-foreground">
                <AppWindow className="h-3 w-3 shrink-0" />
                <span className="truncate">{previewUrl}</span>
              </div>
              <button
                type="button"
                onClick={handleRefreshPreview}
                aria-label="Reload preview"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleOpenExternal}
                aria-label="Open in new tab"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden px-3 pb-3">
          <div className="h-full rounded-lg border border-border bg-card overflow-hidden shadow-[0px_1px_1px_0px_#0000000a,0px_1px_1px_-.5px_#0000000a,0px_3px_3px_-1.5px_#0000000a,0px_6px_6px_-3px_#0000000a,0px_12px_12px_-6px_#0000000a,0px_24px_24px_-12px_#0000000a]">
            <div className={cn('h-full', activeTab !== 'preview' && 'hidden')}>
              <PreviewPanel
                projectId={project.id}
                sandboxId={project.daytona_sandbox_id}
                isBuilding={isBuilding}
                refreshKey={previewKey}
                noPadding
              />
            </div>
            <div className={cn('h-full', activeTab !== 'logs' && 'hidden')}>
              <LogsPanel logs={buildLogs} noPadding />
            </div>
            <div className={cn('h-full', activeTab !== 'code' && 'hidden')}>
              <CodePanel
                projectId={project.id}
                sandboxId={project.daytona_sandbox_id}
                onLineSelection={handleLineSelection}
                noPadding
              />
            </div>
          </div>
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
