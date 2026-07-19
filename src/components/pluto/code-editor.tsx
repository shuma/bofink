'use client'

import { useState, useCallback } from 'react'
import { Highlight, type PrismTheme } from 'prism-react-renderer'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OpenFile, LineSelection } from '@/types/pluto'

// Light syntax palette matching the design: bold magenta keywords, blue
// strings/numbers, orange function names, violet variables, gray comments.
const plutoLight: PrismTheme = {
  plain: {
    color: '#28282C',
    backgroundColor: '#FFFFFF',
  },
  styles: [
    {
      types: ['comment', 'prolog', 'doctype', 'cdata'],
      style: { color: '#8D8D8D' },
    },
    {
      types: ['keyword', 'boolean', 'important'],
      style: { color: '#C2258C', fontWeight: '600' },
    },
    {
      types: ['string', 'char', 'attr-value', 'url', 'regex'],
      style: { color: '#1E4FC2' },
    },
    {
      types: ['number', 'constant', 'symbol', 'atrule', 'unit'],
      style: { color: '#1A63D9' },
    },
    {
      types: ['function', 'class-name', 'maybe-class-name', 'tag'],
      style: { color: '#B4470F' },
    },
    {
      types: ['variable', 'parameter', 'property', 'property-access', 'attr-name', 'selector'],
      style: { color: '#5B54D9' },
    },
    {
      types: ['operator', 'punctuation'],
      style: { color: '#57534E' },
    },
    {
      types: ['builtin', 'namespace'],
      style: { color: '#5B54D9' },
    },
  ],
}

interface CodeEditorProps {
  files: OpenFile[]
  activeIndex: number
  onSelectFile: (index: number) => void
  onCloseFile: (index: number) => void
  selectedLines?: { startLine: number; endLine: number } | null
  onLineSelectionChange?: (selection: LineSelection | null) => void
  actions?: React.ReactNode
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
  actions,
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
          'flex items-center justify-center bg-white',
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
      <div className="flex shrink-0 items-stretch overflow-x-auto border-b border-[#00000014] bg-white">
        {files.map((file, index) => (
          <button
            key={file.path}
            onClick={() => onSelectFile(index)}
            className={cn(
              'group flex items-center gap-2 border-r border-[#00000014] px-4 py-2.5 font-["Inter_Display",var(--font-sans)] text-[15px] transition-colors',
              index === activeIndex
                ? 'bg-white font-medium text-foreground'
                : 'text-muted-foreground hover:bg-black/[0.02] hover:text-foreground'
            )}
          >
            <span className="max-w-[200px] truncate">{file.path}</span>
            <span
              onClick={(e) => {
                e.stopPropagation()
                onCloseFile(index)
              }}
              className={cn(
                'flex h-4 w-4 items-center justify-center rounded-sm transition-colors',
                index === activeIndex
                  ? 'opacity-100'
                  : 'opacity-0 group-hover:opacity-100',
                'hover:bg-muted-foreground/20'
              )}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          </button>
        ))}
        {actions && (
          <div className="ml-auto flex items-center gap-1 px-3">{actions}</div>
        )}
      </div>

      {/* Code content */}
      {activeFile && (
        <div className="flex-1 overflow-auto bg-white">
          <div className="relative min-h-full">
            {/* Full-height line number gutter background */}
            <div className="absolute inset-y-0 left-0 w-[3.25rem] bg-[#F0F0EF]" />
          <Highlight
            theme={plutoLight}
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
                className={cn(hlClassName, 'relative py-4 pr-4 text-sm leading-7')}
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
                            'table-cell w-[3.25rem] min-w-[3.25rem] select-none bg-[#F0F0EF] px-3 text-right',
                            isSelected ? 'text-blue-600' : 'text-[#00000066]'
                          )}
                        >
                          {lineNumber}
                        </span>
                        <span className="table-cell pl-4">
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
        </div>
      )}
    </div>
  )
}
