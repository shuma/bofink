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

function FileIcon({ className }: { className?: string }) {
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
            <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
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
