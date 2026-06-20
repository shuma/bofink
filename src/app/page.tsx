'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PromptInput } from '@/components/pluto/prompt-input'
import { AuthModal } from '@/components/pluto/auth-modal'
import { usePlutoStore } from '@/hooks/use-pluto-store'
import { cn } from '@/lib/utils'

function PlutoLogo({ className }: { className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <Sparkles className="h-full w-full" />
    </div>
  )
}

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
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
        <div className="w-full max-w-2xl space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <PlutoLogo className="h-12 w-12 text-primary mx-auto" />
            <h1 className="font-heading text-4xl md:text-5xl font-medium tracking-tight text-foreground">
              Build apps with AI
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Describe what you want to build and Pluto will create it for you
            </p>
          </div>

          {/* Prompt Input */}
          <PromptInput
            onSubmit={handlePromptSubmit}
            isLoading={isLoading}
            placeholder="Describe the app you want to build..."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-6 left-6 right-6 flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Powered by Claude
        </p>
        {isAuthenticated && (
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            My Projects
          </button>
        )}
      </footer>

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
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  )
}
