'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PromptInput } from '@/components/pluto/prompt-input'
import { ClarifyingQuestions } from '@/components/pluto/clarifying-questions'
import { BuildPlanDisplay } from '@/components/pluto/build-plan'
import { StatusCard } from '@/components/pluto/status-card'
import { usePlutoStore } from '@/hooks/use-pluto-store'
import { createClient } from '@/lib/supabase/client'
import type { ClarifyingQuestionsResponse, BuildPlan } from '@/lib/pluto/schemas'

export default function NewProjectPage() {
  const router = useRouter()
  const {
    prompt,
    setPrompt,
    stage,
    setStage,
    clarifyingQuestions,
    setClarifyingQuestions,
    clarifyingAnswers,
    addClarifyingAnswer,
    buildPlan,
    setBuildPlan,
    setCurrentProject,
    reset,
  } = usePlutoStore()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Recover prompt from sessionStorage on mount
  useEffect(() => {
    const pendingPrompt = sessionStorage.getItem('pending_prompt')
    if (pendingPrompt) {
      setPrompt(pendingPrompt)
      sessionStorage.removeItem('pending_prompt')
      // Automatically start the planning flow
      handlePromptSubmit(pendingPrompt)
    } else if (prompt && stage === 'idle') {
      // If there's a prompt in the store but we're at idle, start planning
      handlePromptSubmit(prompt)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePromptSubmit = async (userPrompt: string) => {
    setIsLoading(true)
    setError(null)
    setPrompt(userPrompt)

    try {
      // Stage 1: Get clarifying questions
      const questionsRes = await fetch('/api/plan/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userPrompt }),
      })

      if (!questionsRes.ok) {
        throw new Error('Failed to generate questions')
      }

      const questionsData: ClarifyingQuestionsResponse = await questionsRes.json()

      if (questionsData.needsClarification && questionsData.questions.length > 0) {
        setClarifyingQuestions(questionsData.questions)
        setStage('clarifying')
      } else {
        // No clarification needed, go straight to build plan
        await generateBuildPlan(userPrompt)
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const generateBuildPlan = async (userPrompt: string) => {
    setIsLoading(true)
    setStage('planning')

    try {
      const planRes = await fetch('/api/plan/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userPrompt,
          answers: clarifyingAnswers,
        }),
      })

      if (!planRes.ok) {
        throw new Error('Failed to generate build plan')
      }

      const plan: BuildPlan = await planRes.json()
      setBuildPlan(plan)
      setStage('review')
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to generate build plan. Please try again.')
      setStage('idle')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClarifyingComplete = () => {
    generateBuildPlan(prompt)
  }

  const handleApprove = async () => {
    if (!buildPlan) return

    setIsLoading(true)

    try {
      // Create project in database
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/?login=true')
        return
      }

      const { data: project, error: createError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: buildPlan.name,
          description: buildPlan.description,
          prompt: prompt,
          plan: buildPlan,
          status: 'building',
        })
        .select()
        .single()

      if (createError) {
        throw createError
      }

      setCurrentProject(project)
      setStage('building')

      // Redirect to project workspace
      router.push(`/projects/${project.id}`)
    } catch (err) {
      console.error('Error creating project:', err)
      setError('Failed to create project. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = () => {
    // Go back to prompt stage
    setStage('idle')
  }

  const handleBack = () => {
    if (stage === 'clarifying') {
      setStage('idle')
    } else if (stage === 'review') {
      if (clarifyingQuestions.length > 0) {
        setStage('clarifying')
      } else {
        setStage('idle')
      }
    } else {
      reset()
      router.push('/')
    }
  }

  return (
    <div className="min-h-svh bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-heading font-medium">Pluto</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8">
        <div className="max-w-3xl mx-auto">
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Idle state - show prompt input */}
          {stage === 'idle' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-heading font-semibold">
                  What do you want to build?
                </h1>
                <p className="text-muted-foreground">
                  Describe your app idea in detail
                </p>
              </div>
              <PromptInput
                onSubmit={handlePromptSubmit}
                isLoading={isLoading}
                placeholder="Describe your app in detail..."
              />
            </div>
          )}

          {/* Planning state - show shimmer status */}
          {stage === 'planning' && (
            <StatusCard label="Creating your build plan…" />
          )}

          {/* Clarifying state - show questions */}
          {stage === 'clarifying' && clarifyingQuestions.length > 0 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-heading font-semibold">
                  A few quick questions
                </h1>
                <p className="text-muted-foreground">
                  Help us understand exactly what you need
                </p>
              </div>
              <ClarifyingQuestions
                questions={clarifyingQuestions}
                answers={clarifyingAnswers}
                onAnswer={addClarifyingAnswer}
                onComplete={handleClarifyingComplete}
                isLoading={isLoading}
              />
            </div>
          )}

          {/* Review state - show build plan */}
          {stage === 'review' && buildPlan && (
            <BuildPlanDisplay
              plan={buildPlan}
              onApprove={handleApprove}
              onEdit={handleEdit}
              isLoading={isLoading}
            />
          )}
        </div>
      </main>
    </div>
  )
}
