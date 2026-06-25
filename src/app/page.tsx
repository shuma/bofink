'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PromptInput } from '@/components/pluto/prompt-input'
import { AuthModal } from '@/components/pluto/auth-modal'
import { usePlutoStore } from '@/hooks/use-pluto-store'

function HomePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const { setPrompt } = usePlutoStore()

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
    }
    checkAuth()
  }, [])

  // Check for login param from redirect
  useEffect(() => {
    if (searchParams.get('login') === 'true') {
      setShowAuthModal(true)
    }
  }, [searchParams])

  const handlePromptSubmit = async (prompt: string) => {
    setIsLoading(true)

    // Store the prompt in zustand (and sessionStorage via persist)
    setPrompt(prompt)

    // Check if user is authenticated
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // User is authenticated, go directly to /new
      router.push('/new')
    } else {
      // Store prompt in sessionStorage for recovery after auth
      sessionStorage.setItem('pending_prompt', prompt)
      setIsLoading(false)
      setShowAuthModal(true)
    }
  }

  return (
    <div className="min-h-svh bg-background flex flex-col">
      {/* Main content - centered */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
        <div className="w-full max-w-xl space-y-10">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="h-8 w-8 rounded-full bg-foreground" />
              <span className="font-heading text-xl font-semibold">Pluto</span>
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
              What do you want to build?
            </h1>
            <p className="text-base text-muted-foreground">
              Describe your app and watch it come to life
            </p>
          </div>

          {/* Prompt Input */}
          <PromptInput
            onSubmit={handlePromptSubmit}
            isLoading={isLoading}
            placeholder="A habit tracker with streaks..."
          />
        </div>
      </main>

      {/* My Projects button */}
      {isAuthenticated && (
        <button
          onClick={() => router.push('/dashboard')}
          className="fixed top-5 right-6 flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="opacity-70"
          >
            <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          My Projects
        </button>
      )}

      {/* Auth Modal */}
      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        redirectTo="/new"
      />
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-svh bg-background flex items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    }>
      <HomePageContent />
    </Suspense>
  )
}
