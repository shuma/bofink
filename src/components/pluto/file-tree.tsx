'use client'

import { useState, useMemo } from 'react'
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Search,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FileNode } from '@/types/pluto'

// File type icon components
function TypeScriptIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <rect x="2" y="2" width="20" height="20" rx="2" fill="#3178c6" />
      <path
        d="M14.5 12v6.5M14.5 12H17c.83 0 1.5.67 1.5 1.5S17.83 15 17 15h-2.5m0 0v3.5M7 12h4m-2 0v6.5"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ReactIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <circle cx="12" cy="12" r="2" fill="#61dafb" />
      <ellipse
        cx="12"
        cy="12"
        rx="9"
        ry="3.5"
        stroke="#61dafb"
        strokeWidth="1"
        fill="none"
      />
      <ellipse
        cx="12"
        cy="12"
        rx="9"
        ry="3.5"
        stroke="#61dafb"
        strokeWidth="1"
        fill="none"
        transform="rotate(60 12 12)"
      />
      <ellipse
        cx="12"
        cy="12"
        rx="9"
        ry="3.5"
        stroke="#61dafb"
        strokeWidth="1"
        fill="none"
        transform="rotate(120 12 12)"
      />
    </svg>
  )
}

function JavaScriptIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <rect x="2" y="2" width="20" height="20" rx="2" fill="#f7df1e" />
      <path
        d="M8 17.5c.83 1 1.5 1.5 2.5 1.5 1.5 0 2-1 2-1.5 0-2-4-1.5-4-4 0-1.5 1.5-2.5 3-2.5 1 0 2 .5 2.5 1M16 11v5.5c0 1-.5 2.5-2 2.5"
        stroke="#323330"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function JSONIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <rect x="2" y="2" width="20" height="20" rx="2" fill="#cbcb41" />
      <path
        d="M8 8c-1 0-1.5.5-1.5 1.5v2c0 .5-.5 1-1 1 .5 0 1 .5 1 1v2c0 1 .5 1.5 1.5 1.5M16 8c1 0 1.5.5 1.5 1.5v2c0 .5.5 1 1 1-.5 0-1 .5-1 1v2c0 1-.5 1.5-1.5 1.5"
        stroke="#323330"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CSSIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <rect x="2" y="2" width="20" height="20" rx="2" fill="#264de4" />
      <path
        d="M7 7h10l-.5 5H9l.25 2.5h7l-.5 3-3.75 1.5-3.75-1.5-.25-2"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function HTMLIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <rect x="2" y="2" width="20" height="20" rx="2" fill="#e34c26" />
      <path
        d="M7 7l1.5 10 3.5 2 3.5-2 1.5-10M8 9h8M8.5 12h7M9 15h6"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MarkdownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <rect
        x="2"
        y="4"
        width="20"
        height="16"
        rx="2"
        fill="#083fa1"
        stroke="#083fa1"
      />
      <path
        d="M5 15V9l2.5 3 2.5-3v6M14 15v-6l3 3.5 3-3.5v6"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PrettierIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <rect x="2" y="2" width="20" height="20" rx="2" fill="#1a2b34" />
      <rect x="5" y="6" width="8" height="2" rx="1" fill="#f7b93e" />
      <rect x="5" y="10" width="14" height="2" rx="1" fill="#56b3b4" />
      <rect x="5" y="14" width="10" height="2" rx="1" fill="#ea5e5e" />
    </svg>
  )
}

function BunIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <ellipse cx="12" cy="14" rx="8" ry="6" fill="#fbf0df" />
      <path
        d="M6 10c0-3 2.5-6 6-6s6 3 6 6"
        stroke="#fbf0df"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="9" cy="13" r="1.5" fill="#333" />
      <circle cx="15" cy="13" r="1.5" fill="#333" />
      <ellipse cx="12" cy="15.5" rx="1" ry="0.5" fill="#f9a8d4" />
    </svg>
  )
}

// Map file extensions to icon components
const FILE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  ts: TypeScriptIcon,
  tsx: ReactIcon,
  jsx: ReactIcon,
  js: JavaScriptIcon,
  json: JSONIcon,
  css: CSSIcon,
  html: HTMLIcon,
  htm: HTMLIcon,
  md: MarkdownIcon,
  mdx: MarkdownIcon,
}

// Special filename mappings
const FILENAME_ICONS: Record<string, React.FC<{ className?: string }>> = {
  '.prettierrc': PrettierIcon,
  '.prettierrc.json': PrettierIcon,
  'prettier.config.js': PrettierIcon,
  'prettier.config.cjs': PrettierIcon,
  'bun.lockb': BunIcon,
  'bunfig.toml': BunIcon,
}

function getFileIcon(
  filename: string
): React.FC<{ className?: string }> | null {
  // Check special filenames first
  if (FILENAME_ICONS[filename]) {
    return FILENAME_ICONS[filename]
  }

  // Then check by extension
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext && FILE_ICONS[ext]) {
    return FILE_ICONS[ext]
  }

  return null
}

interface FileTreeProps {
  tree: FileNode[]
  selectedPath: string | null
  onSelectFile: (node: FileNode) => void
  className?: string
}

interface TreeNodeProps {
  node: FileNode
  depth: number
  selectedPath: string | null
  expandedPaths: Set<string>
  onToggleExpand: (path: string) => void
  onSelectFile: (node: FileNode) => void
  searchQuery: string
}

function DefaultFileIcon({ className }: { className?: string }) {
  return <File className={className} />
}

function matchesSearch(node: FileNode, query: string): boolean {
  if (!query) return true

  const lowerQuery = query.toLowerCase()

  // Check if this node matches
  if (node.name.toLowerCase().includes(lowerQuery)) return true

  // Check if any children match
  if (node.children) {
    return node.children.some((child) => matchesSearch(child, query))
  }

  return false
}

function TreeNode({
  node,
  depth,
  selectedPath,
  expandedPaths,
  onToggleExpand,
  onSelectFile,
  searchQuery,
}: TreeNodeProps) {
  const isExpanded = expandedPaths.has(node.path)
  const isSelected = node.path === selectedPath

  // Filter children based on search
  const visibleChildren = useMemo(() => {
    if (!node.children) return []
    if (!searchQuery) return node.children
    return node.children.filter((child) => matchesSearch(child, searchQuery))
  }, [node.children, searchQuery])

  // Auto-expand directories with matching children when searching
  const shouldShowChildren =
    node.isDir && (isExpanded || (searchQuery && visibleChildren.length > 0))

  const handleClick = () => {
    if (node.isDir) {
      onToggleExpand(node.path)
    } else {
      onSelectFile(node)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          'flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm transition-colors',
          'hover:bg-muted/50',
          isSelected && 'bg-accent text-accent-foreground'
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {node.isDir ? (
          <>
            {shouldShowChildren ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            {shouldShowChildren ? (
              <FolderOpen className="h-4 w-4 shrink-0 text-amber-500" />
            ) : (
              <Folder className="h-4 w-4 shrink-0 text-amber-500" />
            )}
          </>
        ) : (
          <>
            <span className="w-3.5" />
            {(() => {
              const IconComponent = getFileIcon(node.name)
              if (IconComponent) {
                return <IconComponent className="h-4 w-4 shrink-0" />
              }
              return (
                <DefaultFileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              )
            })()}
          </>
        )}
        <span className="truncate">{node.name}</span>
      </button>

      {shouldShowChildren && visibleChildren.length > 0 && (
        <div>
          {visibleChildren.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              onToggleExpand={onToggleExpand}
              onSelectFile={onSelectFile}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FileTree({
  tree,
  selectedPath,
  onSelectFile,
  className,
}: FileTreeProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  const handleToggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  // Filter tree based on search
  const visibleTree = useMemo(() => {
    if (!searchQuery) return tree
    return tree.filter((node) => matchesSearch(node, searchQuery))
  }, [tree, searchQuery])

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Search input */}
      <div className="shrink-0 border-b border-border p-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-8 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tree view */}
      <div className="flex-1 overflow-auto p-2">
        {visibleTree.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">
            {searchQuery ? 'No files match your search' : 'No files found'}
          </p>
        ) : (
          visibleTree.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              depth={0}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              onToggleExpand={handleToggleExpand}
              onSelectFile={onSelectFile}
              searchQuery={searchQuery}
            />
          ))
        )}
      </div>
    </div>
  )
}
