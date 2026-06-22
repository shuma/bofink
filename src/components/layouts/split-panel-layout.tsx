'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface SplitPanelLayoutProps {
  children: React.ReactNode
  className?: string
}

interface LeftPanelProps {
  children: React.ReactNode
  className?: string
}

interface RightPanelProps {
  children: React.ReactNode
  className?: string
}

/**
 * Split panel layout with chat on left and preview/content on right.
 * Split panel layout with chat on left and preview on right.
 *
 * Usage:
 * <SplitPanelLayout>
 *   <SplitPanelLayout.Left>Chat content</SplitPanelLayout.Left>
 *   <SplitPanelLayout.Right>Preview content</SplitPanelLayout.Right>
 * </SplitPanelLayout>
 */
function SplitPanelLayout({ children, className }: SplitPanelLayoutProps) {
  return (
    <div
      className={cn(
        'flex h-full w-full',
        className
      )}
    >
      {children}
    </div>
  )
}

function LeftPanel({ children, className }: LeftPanelProps) {
  return (
    <div
      className={cn(
        'flex flex-col',
        'w-[420px] min-w-[340px] max-w-[480px]',
        'bg-background',
        className
      )}
    >
      {children}
    </div>
  )
}

function RightPanel({ children, className }: RightPanelProps) {
  return (
    <div
      className={cn(
        'flex flex-col flex-1 min-w-0',
        'bg-background',
        className
      )}
    >
      {children}
    </div>
  )
}

// Attach subcomponents
SplitPanelLayout.Left = LeftPanel
SplitPanelLayout.Right = RightPanel

export { SplitPanelLayout }
