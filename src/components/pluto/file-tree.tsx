'use client'

import { useState, useMemo } from 'react'
import {
  Braces,
  ChevronRight,
  ChevronDown,
  Code,
  File,
  FileText,
  Files,
  Image as ImageIcon,
  MoreHorizontal,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FileNode } from '@/types/pluto'

// Monochrome file type icons matching the design language
const ICON_COLOR = '#57534E'

function LabelBadgeIcon({
  label,
  className,
}: {
  label: string
  className?: string
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <rect x="1" y="3" width="22" height="18" rx="5" fill="#E7E5E4" />
      <text
        x="12"
        y="16.5"
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill={ICON_COLOR}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {label}
      </text>
    </svg>
  )
}

function TypeScriptIcon({ className }: { className?: string }) {
  return <LabelBadgeIcon label="TS" className={className} />
}

function JavaScriptIcon({ className }: { className?: string }) {
  return <LabelBadgeIcon label="JS" className={className} />
}

function CSSIcon({ className }: { className?: string }) {
  return <LabelBadgeIcon label="css" className={className} />
}

function ReactIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <circle cx="12" cy="12" r="2" fill={ICON_COLOR} />
      <ellipse cx="12" cy="12" rx="9" ry="3.5" stroke={ICON_COLOR} strokeWidth="1.3" />
      <ellipse
        cx="12"
        cy="12"
        rx="9"
        ry="3.5"
        stroke={ICON_COLOR}
        strokeWidth="1.3"
        transform="rotate(60 12 12)"
      />
      <ellipse
        cx="12"
        cy="12"
        rx="9"
        ry="3.5"
        stroke={ICON_COLOR}
        strokeWidth="1.3"
        transform="rotate(120 12 12)"
      />
    </svg>
  )
}

function GitIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <circle cx="12" cy="12" r="11" fill={ICON_COLOR} />
      <circle cx="9.5" cy="7.5" r="1.7" fill="white" />
      <circle cx="9.5" cy="16.5" r="1.7" fill="white" />
      <circle cx="16" cy="10" r="1.7" fill="white" />
      <path d="M9.5 9.2v5.6" stroke="white" strokeWidth="1.4" />
      <path d="M9.5 13.5c0-2.5 6.5-1 6.5-3.5" stroke="white" strokeWidth="1.4" />
    </svg>
  )
}

// Map file extensions to icon components
const FILE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  ts: TypeScriptIcon,
  tsx: ReactIcon,
  jsx: ReactIcon,
  js: JavaScriptIcon,
  json: Braces,
  css: CSSIcon,
  html: Code,
  htm: Code,
  md: FileText,
  mdx: FileText,
  ico: ImageIcon,
  png: ImageIcon,
  jpg: ImageIcon,
  jpeg: ImageIcon,
  gif: ImageIcon,
  webp: ImageIcon,
  svg: Files,
}

// Special filename mappings
const FILENAME_ICONS: Record<string, React.FC<{ className?: string }>> = {
  '.gitignore': GitIcon,
  '.gitattributes': GitIcon,
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
          'group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left font-["Inter_Display",var(--font-sans)] text-[15px] leading-6 transition-colors',
          'hover:bg-black/[0.03]',
          isSelected && 'bg-[#E4EBF5] text-foreground'
        )}
      >
        {node.isDir ? (
          shouldShowChildren ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )
        ) : (
          (() => {
            const IconComponent = getFileIcon(node.name)
            if (IconComponent) {
              return (
                <IconComponent className="h-4 w-4 shrink-0 text-[#57534E]" />
              )
            }
            return (
              <DefaultFileIcon className="h-4 w-4 shrink-0 text-[#57534E]" />
            )
          })()
        )}
        <span className="min-w-0 flex-1 truncate">{node.name}</span>
        {isSelected && !node.isDir && (
          <MoreHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {shouldShowChildren && visibleChildren.length > 0 && (
        <div className="ml-[15px] border-l border-[#00000014] pl-1.5">
          {visibleChildren.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
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
      <div className="shrink-0 p-3">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search code"
            className="h-11 w-full rounded-xl border border-[#00000029] bg-white px-4 pr-8 font-['Inter_Display',var(--font-sans)] text-[15px] text-foreground shadow-[0_1px_2px_0_#00000005] placeholder:text-[#00000080] focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tree view */}
      <div className="flex-1 overflow-auto px-3 pb-3">
        {visibleTree.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">
            {searchQuery ? 'No files match your search' : 'No files found'}
          </p>
        ) : (
          visibleTree.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
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
