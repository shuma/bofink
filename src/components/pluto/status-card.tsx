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
        'flex items-center gap-3 bg-white rounded-[20px] border border-[#00000029] shadow-[0_1px_2px_0_#00000005] px-5 py-4',
        className
      )}
    >
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
      <div className="min-w-0 space-y-0.5">
        <p className="shimmer font-['Inter_Display',var(--font-sans)] text-base font-medium leading-6 tracking-[0.012em] text-foreground">
          {label}
        </p>
        {sublabel && (
          <p className="text-[13px] text-muted-foreground/70">{sublabel}</p>
        )}
      </div>
    </div>
  )
}
