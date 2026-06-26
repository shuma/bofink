'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
import { DemoPreviewPanel } from '@/components/pluto/demo-preview-panel'
import { DemoCodePanel } from '@/components/pluto/demo-code-panel'
import { LogsPanel } from '@/components/pluto/logs-panel'
import { PlutoOrb } from '@/components/pluto/pluto-orb'
import { Switch } from '@/components/ui/switch'
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
import { DEMO_PROJECT, DEMO_MESSAGES, DEMO_BUILD_LOGS } from '@/lib/demo/mock-data'
import type { LineSelection } from '@/types/pluto'
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

export default function DemoPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<UIMessage[]>(DEMO_MESSAGES)
  const [activeTab, setActiveTab] = useState<'preview' | 'logs' | 'code'>('preview')
  const [lineSelection, setLineSelection] = useState<LineSelection | null>(null)
  const [isBuilding, setIsBuilding] = useState(false)
  const [showLoading, setShowLoading] = useState(false)

  const project = DEMO_PROJECT
  const previewUrl = 'https://demo-todo-app.pluto.dev'

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

  // Mock send - adds message to local state with mock response
  const handleSendMessage = useCallback((text: string) => {
    const userMessage: UIMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      parts: [{ type: 'text', text }],
    }

    const aiResponse: UIMessage = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: "This is a demo response. In the real app, Pluto would analyze your request and make changes to your code.",
        },
      ],
    }

    // Simulate building state
    setIsBuilding(true)
    setMessages((prev) => [...prev, userMessage])

    // Simulate AI response after a delay
    setTimeout(() => {
      setMessages((prev) => [...prev, aiResponse])
      setIsBuilding(false)
    }, 1500)
  }, [])

  const handleBack = useCallback(() => {
    router.push('/')
  }, [router])

  // Get display content from message
  const getMessageContent = (message: UIMessage): string => {
    const textParts = message.parts?.filter(
      (part): part is { type: 'text'; text: string } =>
        part.type === 'text' && 'text' in part
    )

    if (!textParts || textParts.length === 0) return ''

    if (message.role === 'assistant') {
      return textParts[textParts.length - 1].text
    }

    return textParts.map((p) => p.text).join('\n')
  }

  // Show loading state when toggle is on
  if (showLoading) {
    return (
      <div className="min-h-svh bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <PlutoOrb size={48} speed={20} />
          <p className="text-sm text-muted-foreground">Loading project...</p>
        </div>
        {/* Floating switch to toggle back */}
        <div className="fixed top-4 right-4 flex items-center gap-2 rounded-lg bg-card border border-border px-3 py-2 shadow-sm">
          <span className="text-xs text-muted-foreground">Loading</span>
          <Switch
            checked={showLoading}
            onCheckedChange={setShowLoading}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="h-svh bg-background">
      <SplitPanelLayout>
        {/* Left side - Chat */}
        <SplitPanelLayout.Left>
          {/* Project Header */}
          <div className="shrink-0 px-3 py-2.5">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="group flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-muted"
                aria-label="Back to projects"
              >
                <PlutoOrb size={28} />
                <span className="truncate font-heading text-sm font-medium">
                  {project.name}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                Demo
              </span>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Loading</span>
                <Switch
                  checked={showLoading}
                  onCheckedChange={setShowLoading}
                />
              </div>
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
              if (!content.trim()) return null

              if (message.role === 'user') {
                return (
                  <div
                    key={`${message.id}-${index}`}
                    className="inline-block max-w-full rounded-2xl rounded-br-sm border border-border/40 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  >
                    <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">
                      {content}
                    </p>
                  </div>
                )
              }

              return (
                <div
                  key={`${message.id}-${index}`}
                  className="rounded-2xl border border-border/40 bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      Edited
                    </span>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                      index.tsx
                    </span>
                  </div>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
                    {content}
                  </p>
                  {project.plan?.name && (
                    <div className="mt-2.5 flex items-center gap-1.5 border-t border-border/40 pt-2.5 text-sm text-muted-foreground">
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

            {isBuilding && (
              <div className="flex items-center gap-2 rounded-2xl border border-border/40 bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            )}
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
                  handleSendMessage(message)
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
                    onStop={() => setIsBuilding(false)}
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
          <div className="flex items-center gap-3 px-4 py-2.5">
            <div className="view-switcher-track inline-flex items-center rounded-full">
              <button
                onClick={() => setActiveTab('preview')}
                className={cn(
                  'flex items-center justify-center rounded-full text-sm font-medium transition-all',
                  activeTab === 'preview'
                    ? 'view-switcher-pill gap-2 h-8 px-3'
                    : 'h-8 w-8 text-muted-foreground hover:text-foreground'
                )}
                aria-label="Preview"
              >
                <Globe className="h-4 w-4 shrink-0" />
                {activeTab === 'preview' && <span>Preview</span>}
              </button>
              {activeTab !== 'preview' && activeTab !== 'logs' && (
                <div className="view-switcher-divider" />
              )}
              <button
                onClick={() => setActiveTab('logs')}
                className={cn(
                  'flex items-center justify-center rounded-full text-sm font-medium transition-all',
                  activeTab === 'logs'
                    ? 'view-switcher-pill gap-2 h-8 px-3'
                    : 'h-8 w-8 text-muted-foreground hover:text-foreground'
                )}
                aria-label="Build Logs"
              >
                <FileText className="h-4 w-4 shrink-0" />
                {activeTab === 'logs' && <span>Build Logs</span>}
              </button>
              {activeTab !== 'logs' && activeTab !== 'code' && (
                <div className="view-switcher-divider" />
              )}
              <button
                onClick={() => setActiveTab('code')}
                className={cn(
                  'flex items-center justify-center rounded-full text-sm font-medium transition-all',
                  activeTab === 'code'
                    ? 'view-switcher-pill gap-2 h-8 px-3'
                    : 'h-8 w-8 text-muted-foreground hover:text-foreground'
                )}
                aria-label="Code"
              >
                <Code className="h-4 w-4 shrink-0" />
                {activeTab === 'code' && <span>Code</span>}
              </button>
              {activeTab !== 'code' && (
                <div className="view-switcher-divider" />
              )}
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Layers"
              >
                <Layers className="h-4 w-4" />
              </button>
            </div>

            {/* URL bar - only show when preview tab is active */}
            {activeTab === 'preview' && (
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-full bg-muted/50 px-3 text-xs text-muted-foreground">
                  <AppWindow className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{previewUrl}</span>
                </div>
                <button
                  type="button"
                  aria-label="Reload preview"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Open in new tab"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden px-3 pb-3">
            <div className="h-full rounded-lg border border-border bg-card overflow-hidden shadow-[0px_1px_1px_0px_#0000000a,0px_1px_1px_-.5px_#0000000a,0px_3px_3px_-1.5px_#0000000a,0px_6px_6px_-3px_#0000000a,0px_12px_12px_-6px_#0000000a,0px_24px_24px_-12px_#0000000a]">
              <div className={cn('h-full', activeTab !== 'preview' && 'hidden')}>
                <DemoPreviewPanel isBuilding={isBuilding} />
              </div>
              <div className={cn('h-full', activeTab !== 'logs' && 'hidden')}>
                <LogsPanel logs={DEMO_BUILD_LOGS} noPadding />
              </div>
              <div className={cn('h-full', activeTab !== 'code' && 'hidden')}>
                <DemoCodePanel onLineSelection={handleLineSelection} noPadding />
              </div>
            </div>
          </div>
        </SplitPanelLayout.Right>
      </SplitPanelLayout>
    </div>
  )
}
