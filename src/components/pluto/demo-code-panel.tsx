'use client'

import { useState, useCallback } from 'react'
import { Copy, Download, Check } from 'lucide-react'
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
      <div className={cn('flex h-full flex-col overflow-hidden bg-white', !noPadding && 'rounded-[20px] border border-[#00000029] shadow-[0_1px_2px_0_#00000005]')}>
        {/* Main content: file tree + editor */}
        <div className="flex flex-1 overflow-hidden">
          {/* File tree sidebar */}
          <div className="w-64 shrink-0 border-r border-[#00000014]">
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
              actions={
                openFiles.length > 0 ? (
                  <>
                    <button
                      onClick={handleDownload}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-black/5 hover:text-foreground"
                      aria-label="Download file"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleCopy}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-black/5 hover:text-foreground"
                      aria-label="Copy file content"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </>
                ) : undefined
              }
              className="h-full"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
