'use client'

import { useState, useCallback } from 'react'
import { Lock, Copy, Download, Check } from 'lucide-react'
import { FileTree } from './file-tree'
import { CodeEditor } from './code-editor'
import { cn } from '@/lib/utils'
import { DEMO_FILE_TREE, DEMO_FILE_CONTENTS } from '@/lib/demo/mock-data'
import type { FileNode, OpenFile, LineSelection } from '@/types/pluto'

interface DemoCodePanelProps {
  onLineSelection?: (selection: LineSelection | null) => void
  className?: string
  noPadding?: boolean
}

const MAX_OPEN_FILES = 10

// Map file extensions to language identifiers
function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    json: 'json',
    css: 'css',
    html: 'html',
    md: 'markdown',
  }
  return languageMap[ext || ''] || 'text'
}

export function DemoCodePanel({ onLineSelection, className, noPadding = false }: DemoCodePanelProps) {
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([])
  const [activeFileIndex, setActiveFileIndex] = useState(0)
  const [copied, setCopied] = useState(false)
  const [lineSelection, setLineSelection] = useState<LineSelection | null>(null)

  // Handle line selection change
  const handleLineSelectionChange = useCallback(
    (selection: LineSelection | null) => {
      setLineSelection(selection)
      onLineSelection?.(selection)
    },
    [onLineSelection]
  )

  // Handle file selection - use mock data instead of API
  const handleSelectFile = useCallback(
    (node: FileNode) => {
      if (node.isDir) return

      // Check if file is already open
      const existingIndex = openFiles.findIndex((f) => f.path === node.path)
      if (existingIndex !== -1) {
        setActiveFileIndex(existingIndex)
        return
      }

      // Get content from mock data
      const content = DEMO_FILE_CONTENTS[node.path] || `// Content for ${node.name}`

      const newFile: OpenFile = {
        path: node.path,
        name: node.name,
        content,
        language: getLanguageFromPath(node.path),
      }

      setOpenFiles((prev) => {
        // If at max, close the oldest file
        const files = prev.length >= MAX_OPEN_FILES ? prev.slice(1) : prev
        return [...files, newFile]
      })
      setActiveFileIndex(
        openFiles.length >= MAX_OPEN_FILES ? MAX_OPEN_FILES - 1 : openFiles.length
      )
    },
    [openFiles]
  )

  const handleCloseFile = useCallback(
    (index: number) => {
      setOpenFiles((prev) => prev.filter((_, i) => i !== index))
      setActiveFileIndex((prev) => {
        if (prev >= index && prev > 0) {
          return prev - 1
        }
        return prev
      })
    },
    []
  )

  const handleCopy = useCallback(async () => {
    const activeFile = openFiles[activeFileIndex]
    if (!activeFile) return

    try {
      await navigator.clipboard.writeText(activeFile.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [openFiles, activeFileIndex])

  const handleDownload = useCallback(() => {
    const activeFile = openFiles[activeFileIndex]
    if (!activeFile) return

    const blob = new Blob([activeFile.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = activeFile.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [openFiles, activeFileIndex])

  const selectedPath = openFiles[activeFileIndex]?.path || null

  return (
    <div className={cn('flex h-full flex-col', !noPadding && 'px-3 pb-3', className)}>
      <div className={cn('flex h-full flex-col overflow-hidden bg-card', !noPadding && 'rounded-2xl border border-border')}>
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              Read only
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
              Demo Mode
            </span>
          </div>
          {openFiles.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopy}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Copy file content"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={handleDownload}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Download file"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Main content: file tree + editor */}
        <div className="flex flex-1 overflow-hidden">
          {/* File tree sidebar */}
          <div className="w-56 shrink-0 border-r border-border">
            <FileTree
              tree={DEMO_FILE_TREE}
              selectedPath={selectedPath}
              onSelectFile={handleSelectFile}
              className="h-full"
            />
          </div>

          {/* Code editor */}
          <div className="flex-1 overflow-hidden">
            <CodeEditor
              files={openFiles}
              activeIndex={activeFileIndex}
              onSelectFile={setActiveFileIndex}
              onCloseFile={handleCloseFile}
              selectedLines={
                lineSelection &&
                openFiles[activeFileIndex]?.path === lineSelection.filePath
                  ? {
                      startLine: lineSelection.startLine,
                      endLine: lineSelection.endLine,
                    }
                  : null
              }
              onLineSelectionChange={handleLineSelectionChange}
              className="h-full"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
