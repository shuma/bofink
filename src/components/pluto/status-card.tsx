'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatusCardProps {
  label: string
  sublabel?: string
  className?: string
}

export function StatusCard({ label, sublabel, className }: StatusCardProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 bg-card rounded-2xl ring-1 ring-border/20 px-5 py-4',
        className
      )}
    >
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
      <div className="min-w-0 space-y-0.5">
        <p className="shimmer text-[14px] font-medium leading-snug text-foreground">
          {label}
        </p>
        {sublabel && (
          <p className="text-[13px] text-muted-foreground/70">{sublabel}</p>
        )}
      </div>
    </div>
  )
}
