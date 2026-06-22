'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface ChatLayoutProps {
  children: React.ReactNode
  className?: string
}

interface ChatHeaderProps {
  children: React.ReactNode
  className?: string
}

interface ChatMessagesProps {
  children: React.ReactNode
  className?: string
}

interface ChatInputProps {
  children: React.ReactNode
  className?: string
}

/**
 * Full-width chat layout centered on screen.
 * Full-width centered chat layout for chat-first experiences.
 *
 * Usage:
 * <ChatLayout>
 *   <ChatLayout.Header>Header content</ChatLayout.Header>
 *   <ChatLayout.Messages>Messages</ChatLayout.Messages>
 *   <ChatLayout.Input>Input bar</ChatLayout.Input>
 * </ChatLayout>
 */
function ChatLayout({ children, className }: ChatLayoutProps) {
  return (
    <div
      className={cn(
        'flex flex-col h-full w-full',
        'max-w-3xl mx-auto',
        className
      )}
    >
      {children}
    </div>
  )
}

function ChatHeader({ children, className }: ChatHeaderProps) {
  return (
    <header
      className={cn(
        'shrink-0 px-4 py-3',
        className
      )}
    >
      {children}
    </header>
  )
}

function ChatMessages({ children, className }: ChatMessagesProps) {
  return (
    <div
      className={cn(
        'flex-1 overflow-y-auto',
        'px-4 py-6',
        'scrollbar-none',
        className
      )}
    >
      {children}
    </div>
  )
}

function ChatInput({ children, className }: ChatInputProps) {
  return (
    <div
      className={cn(
        'shrink-0 px-4 pb-4 pt-2',
        className
      )}
    >
      {children}
    </div>
  )
}

// Attach subcomponents
ChatLayout.Header = ChatHeader
ChatLayout.Messages = ChatMessages
ChatLayout.Input = ChatInput

export { ChatLayout }
