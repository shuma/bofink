'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowUp, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PromptInputProps {
  onSubmit: (prompt: string) => void
  isLoading?: boolean
  placeholder?: string
  className?: string
}

const EXAMPLE_PROMPTS = [
  'A recipe sharing app where users can save and organize recipes',
  'A simple habit tracker with streaks and daily reminders',
  'A portfolio site with project showcase and contact form',
  'A bookmark manager with tags and search',
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
            'relative rounded-3xl',
            'bg-[image:var(--gradient-input-fill)]',
            'shadow-[var(--shadow-input-base)]',
            'transition-all duration-200',
            'hover:shadow-[var(--shadow-input-hover)]',
            'focus-within:shadow-[var(--shadow-input-focus),var(--glow-input-focus)]'
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
              'w-full resize-none bg-transparent px-5 py-4 pr-16',
              'text-foreground placeholder:text-muted-foreground/60',
              'focus:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'min-h-[60px] max-h-[200px]'
            )}
          />
          <Button
            onClick={handleSubmit}
            disabled={!value.trim() || isLoading}
            size="icon"
            className={cn(
              'absolute right-3 bottom-3 h-10 w-10 rounded-full',
              'transition-all duration-200',
              value.trim() && !isLoading
                ? [
                    'bg-foreground text-background',
                    'shadow-[var(--shadow-button-neutral)]',
                    'hover:bg-foreground/90 hover:shadow-[var(--shadow-button-neutral-hover)]',
                  ].join(' ')
                : 'bg-muted text-muted-foreground shadow-none'
            )}
          >
            {isLoading ? (
              <Sparkles className="h-4 w-4 animate-pulse" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </Button>
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
              'px-3.5 py-2 text-sm rounded-xl',
              'bg-[image:var(--gradient-input-fill)]',
              'shadow-[var(--shadow-button-neutral)]',
              'text-muted-foreground',
              'transition-all duration-200',
              'hover:shadow-[var(--shadow-button-neutral-hover)]',
              'hover:text-foreground',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {prompt.length > 40 ? prompt.slice(0, 40) + '...' : prompt}
          </button>
        ))}
      </div>
    </div>
  )
}
