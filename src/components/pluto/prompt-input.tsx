'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PromptInputProps {
  onSubmit: (prompt: string) => void
  isLoading?: boolean
  placeholder?: string
  className?: string
}

const EXAMPLE_PROMPTS = [
  'Recipe sharing app',
  'Habit tracker with streaks',
  'Portfolio website',
  'Bookmark manager',
]

export function PromptInput({
  onSubmit,
  isLoading = false,
  placeholder = 'Describe the app you want to build...',
  className,
}: PromptInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [value])

  const handleSubmit = () => {
    if (value.trim() && !isLoading) {
      onSubmit(value.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className={cn('w-full space-y-4', className)}>
      <div className="relative">
        <div
          className={cn(
            'relative rounded-2xl',
            'bg-card ring-1 ring-border/60',
            'transition-all duration-150',
            'focus-within:ring-foreground/20'
          )}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            rows={1}
            className={cn(
              'w-full resize-none bg-transparent px-4 py-3.5 pr-14',
              'text-[15px] text-foreground placeholder:text-muted-foreground/50',
              'focus:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'min-h-[52px] max-h-[200px]'
            )}
          />
          <button
            onClick={handleSubmit}
            disabled={!value.trim() || isLoading}
            className={cn(
              'absolute right-2.5 bottom-2.5 h-8 w-8 rounded-full',
              'inline-flex items-center justify-center',
              'transition-all duration-150',
              value.trim() && !isLoading
                ? 'bg-foreground text-background hover:bg-foreground/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Example prompts */}
      <div className="flex flex-wrap gap-2 justify-center">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => setValue(prompt)}
            disabled={isLoading}
            className={cn(
              'px-3 py-1.5 text-[13px] rounded-full',
              'bg-transparent ring-1 ring-border/60',
              'text-muted-foreground',
              'transition-colors duration-150',
              'hover:ring-border hover:text-foreground',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}
