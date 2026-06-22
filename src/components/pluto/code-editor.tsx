'use client'

import { useState, useCallback } from 'react'
import { Highlight, themes } from 'prism-react-renderer'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OpenFile, LineSelection } from '@/types/pluto'

interface CodeEditorProps {
  files: OpenFile[]
  activeIndex: number
  onSelectFile: (index: number) => void
  onCloseFile: (index: number) => void
  selectedLines?: { startLine: number; endLine: number } | null
  onLineSelectionChange?: (selection: LineSelection | null) => void
  className?: string
}

// Map file extensions to Prism languages
function getLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()

  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    json: 'json',
    css: 'css',
    scss: 'scss',
    html: 'markup',
    htm: 'markup',
    xml: 'markup',
    svg: 'markup',
    md: 'markdown',
    mdx: 'markdown',
    yaml: 'yaml',
    yml: 'yaml',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    sql: 'sql',
  }

  return languageMap[ext || ''] || 'plain'
}

export function CodeEditor({
  files,
  activeIndex,
  onSelectFile,
  onCloseFile,
  selectedLines,
  onLineSelectionChange,
  className,
}: CodeEditorProps) {
  const activeFile = files[activeIndex]
  const [selectionStart, setSelectionStart] = useState<number | null>(null)

  const isLineSelected = useCallback(
    (lineNumber: number): boolean => {
      if (!selectedLines) return false
      return (
        lineNumber >= selectedLines.startLine &&
        lineNumber <= selectedLines.endLine
      )
    },
    [selectedLines]
  )

  const handleLineClick = useCallback(
    (lineNumber: number, shiftKey: boolean) => {
      if (!activeFile || !onLineSelectionChange) return

      if (shiftKey && selectionStart !== null) {
        // Range selection with shift+click
        const start = Math.min(selectionStart, lineNumber)
        const end = Math.max(selectionStart, lineNumber)
        onLineSelectionChange({
          filePath: activeFile.path,
          fileName: activeFile.name,
          startLine: start,
          endLine: end,
        })
      } else {
        // Single line selection
        setSelectionStart(lineNumber)
        onLineSelectionChange({
          filePath: activeFile.path,
          fileName: activeFile.name,
          startLine: lineNumber,
          endLine: lineNumber,
        })
      }
    },
    [activeFile, selectionStart, onLineSelectionChange]
  )

  if (files.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted/20',
          className
        )}
      >
        <p className="text-sm text-muted-foreground">
          Select a file to view its contents
        </p>
      </div>
    )
  }

  return (
    <div className={cn('flex h-full flex-col overflow-hidden', className)}>
      {/* Tab bar */}
      <div className="flex shrink-0 items-center gap-0.5 overflow-x-auto border-b border-border bg-muted/30 px-2">
        {files.map((file, index) => (
          <button
            key={file.path}
            onClick={() => onSelectFile(index)}
            className={cn(
              'group flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors',
              index === activeIndex
                ? 'border-primary bg-background text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            <span className="max-w-[120px] truncate">{file.name}</span>
            <span
              onClick={(e) => {
                e.stopPropagation()
                onCloseFile(index)
              }}
              className={cn(
                'flex h-4 w-4 items-center justify-center rounded-sm transition-colors',
                'opacity-0 group-hover:opacity-100',
                'hover:bg-muted-foreground/20'
              )}
            >
              <X className="h-3 w-3" />
            </span>
          </button>
        ))}
      </div>

      {/* Code content */}
      {activeFile && (
        <div className="flex-1 overflow-auto rounded-br-2xl bg-white">
          <Highlight
            theme={themes.github}
            code={activeFile.content}
            language={getLanguage(activeFile.name)}
          >
            {({
              className: hlClassName,
              style,
              tokens,
              getLineProps,
              getTokenProps,
            }) => (
              <pre
                className={cn(hlClassName, 'p-4 text-sm leading-relaxed')}
                style={{ ...style, margin: 0, background: 'transparent' }}
              >
                <code>
                  {tokens.map((line, lineIndex) => {
                    const lineNumber = lineIndex + 1
                    const { key: _lineKey, ...lineProps } = getLineProps({ line })
                    const isSelected = isLineSelected(lineNumber)

                    return (
                      <div
                        key={lineIndex}
                        {...lineProps}
                        className={cn(
                          'table-row cursor-pointer transition-colors',
                          isSelected && 'bg-blue-100'
                        )}
                        onClick={(e) => handleLineClick(lineNumber, e.shiftKey)}
                      >
                        <span
                          className={cn(
                            'table-cell select-none pr-4 text-right',
                            isSelected ? 'text-blue-600' : 'text-gray-400'
                          )}
                        >
                          {lineNumber}
                        </span>
                        <span className="table-cell">
                          {line.map((token, tokenIndex) => {
                            const { key: _tokenKey, ...tokenProps } = getTokenProps({ token })
                            return (
                              <span
                                key={tokenIndex}
                                {...tokenProps}
                              />
                            )
                          })}
                        </span>
                      </div>
                    )
                  })}
                </code>
              </pre>
            )}
          </Highlight>
        </div>
      )}
    </div>
  )
}
