'use client'

import * as React from 'react'
import { Group, Panel, Separator, type PanelImperativeHandle } from 'react-resizable-panels'
import { cn } from '@/lib/utils'

interface SplitPanelLayoutProps {
  children: React.ReactNode
  className?: string
  sidebarCollapsed?: boolean
  onSidebarCollapse?: (collapsed: boolean) => void
}

interface LeftPanelProps {
  children: React.ReactNode
  className?: string
  defaultSize?: number
  minSize?: number
  maxSize?: number
  collapsed?: boolean
  onCollapse?: (collapsed: boolean) => void
  panelRef?: React.RefObject<PanelImperativeHandle | null>
}

interface RightPanelProps {
  children: React.ReactNode
  className?: string
}

interface ResizeHandleProps {
  className?: string
}

/**
 * Split panel layout with chat on left and preview/content on right.
 * Supports resizable panels with drag-to-resize and collapse functionality.
 *
 * Usage:
 * <SplitPanelLayout>
 *   <SplitPanelLayout.Left>Chat content</SplitPanelLayout.Left>
 *   <SplitPanelLayout.ResizeHandle />
 *   <SplitPanelLayout.Right>Preview content</SplitPanelLayout.Right>
 * </SplitPanelLayout>
 */
function SplitPanelLayout({ children, className }: SplitPanelLayoutProps) {
  return (
    <Group
      orientation="horizontal"
      className={cn('h-full w-full', className)}
    >
      {children}
    </Group>
  )
}

function LeftPanel({
  children,
  className,
  defaultSize = 30,
  minSize = 20,
  maxSize = 50,
  collapsed = false,
  onCollapse,
  panelRef,
}: LeftPanelProps) {
  const internalRef = React.useRef<PanelImperativeHandle>(null)
  const ref = panelRef || internalRef

  React.useEffect(() => {
    if (ref.current) {
      if (collapsed) {
        ref.current.collapse()
      } else {
        ref.current.expand()
      }
    }
  }, [collapsed, ref])

  return (
    <Panel
      panelRef={ref}
      defaultSize={`${defaultSize}%`}
      minSize={`${minSize}%`}
      maxSize={`${maxSize}%`}
      collapsible
      collapsedSize={0}
      onResize={(size) => {
        if (size.asPercentage === 0 && !collapsed) {
          onCollapse?.(true)
        } else if (size.asPercentage > 0 && collapsed) {
          onCollapse?.(false)
        }
      }}
      className={cn(
        'flex flex-col bg-background transition-opacity duration-200',
        collapsed && 'opacity-0',
        className
      )}
    >
      {children}
    </Panel>
  )
}

function ResizeHandle({ className }: ResizeHandleProps) {
  return (
    <Separator
      className={cn(
        'group relative w-1 bg-transparent transition-colors duration-150',
        'hover:bg-border focus-visible:bg-border',
        'data-[resize-handle-active]:bg-primary',
        className
      )}
    />
  )
}

function RightPanel({ children, className }: RightPanelProps) {
  return (
    <Panel
      minSize="30%"
      className={cn(
        'flex flex-col min-w-0 bg-background',
        className
      )}
    >
      {children}
    </Panel>
  )
}

// Attach subcomponents
SplitPanelLayout.Left = LeftPanel
SplitPanelLayout.Right = RightPanel
SplitPanelLayout.ResizeHandle = ResizeHandle

export { SplitPanelLayout }
export type { PanelImperativeHandle }
