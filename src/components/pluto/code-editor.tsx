'use client'

import { Highlight, themes } from 'prism-react-renderer'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OpenFile } from '@/types/pluto'

interface CodeEditorProps {
  files: OpenFile[]
  activeIndex: number
  onSelectFile: (index: number) => void
  onCloseFile: (index: number) => void
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
  className,
}: CodeEditorProps) {
  const activeFile = files[activeIndex]

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
        <div className="flex-1 overflow-auto rounded-br-2xl bg-[#1e1e1e]">
          <Highlight
            theme={themes.vsDark}
            code={activeFile.content}
            language={getLanguage(activeFile.name)}
          >
            {({ className: hlClassName, style, tokens, getLineProps, getTokenProps }) => (
              <pre
                className={cn(hlClassName, 'p-4 text-sm leading-relaxed')}
                style={{ ...style, margin: 0, background: 'transparent' }}
              >
                <code>
                  {tokens.map((line, lineIndex) => {
                    const lineProps = getLineProps({ line, key: lineIndex })
                    return (
                      <div
                        key={lineIndex}
                        {...lineProps}
                        className="table-row"
                      >
                        <span className="table-cell select-none pr-4 text-right text-muted-foreground/50">
                          {lineIndex + 1}
                        </span>
                        <span className="table-cell">
                          {line.map((token, tokenIndex) => (
                            <span
                              key={tokenIndex}
                              {...getTokenProps({ token, key: tokenIndex })}
                            />
                          ))}
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
