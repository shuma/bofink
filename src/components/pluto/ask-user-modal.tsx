'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { AskUserRequest } from '@/types/pluto'

interface AskUserModalProps {
  request: AskUserRequest | null
  onSubmit: (value: string) => void
  onCancel: () => void
}

export function AskUserModal({ request, onSubmit, onCancel }: AskUserModalProps) {
  const [selectedValue, setSelectedValue] = useState<string | null>(null)
  const [customValue, setCustomValue] = useState('')
  const [isCustom, setIsCustom] = useState(false)

  if (!request) return null

  const handleSubmit = () => {
    const value = isCustom ? customValue : selectedValue
    if (value) {
      onSubmit(value)
      // Reset state
      setSelectedValue(null)
      setCustomValue('')
      setIsCustom(false)
    }
  }

  const hasOptions = request.options && request.options.length > 0
  const canSubmit = isCustom ? customValue.trim() : selectedValue

  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Input Needed</DialogTitle>
          <DialogDescription>{request.question}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Options */}
          {hasOptions && (
            <div className="space-y-2">
              {request.options!.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSelectedValue(option.value)
                    setIsCustom(false)
                  }}
                  className={cn(
                    'w-full p-3 text-left rounded-lg',
                    'ring-1 transition-all duration-200',
                    selectedValue === option.value && !isCustom
                      ? 'bg-primary text-primary-foreground ring-primary'
                      : 'bg-card ring-border hover:ring-border/80'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {/* Custom input */}
          {request.allowCustom && (
            <div className="space-y-2">
              {hasOptions && (
                <p className="text-sm text-muted-foreground">Or enter custom value:</p>
              )}
              <Input
                value={customValue}
                onChange={(e) => {
                  setCustomValue(e.target.value)
                  setIsCustom(true)
                  setSelectedValue(null)
                }}
                placeholder="Type your answer..."
                className={cn(
                  isCustom && 'ring-2 ring-primary'
                )}
              />
            </div>
          )}

          {/* If no options and no custom allowed, just show input */}
          {!hasOptions && !request.allowCustom && (
            <Input
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              placeholder="Type your answer..."
            />
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            Submit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
