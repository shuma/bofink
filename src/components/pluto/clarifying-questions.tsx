'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ClarifyingQuestion, ClarifyingAnswer } from '@/types/pluto'

interface ClarifyingQuestionsProps {
  questions: ClarifyingQuestion[]
  answers: ClarifyingAnswer[]
  onAnswer: (answer: ClarifyingAnswer) => void
  onComplete: () => void
  isLoading?: boolean
}

interface QuestionCardProps {
  question: ClarifyingQuestion
  selectedValue: string | string[] | undefined
  onSelect: (value: string | string[]) => void
}

function QuestionCard({ question, selectedValue, onSelect }: QuestionCardProps) {
  const [multiSelected, setMultiSelected] = useState<string[]>(
    Array.isArray(selectedValue) ? selectedValue : []
  )

  const handleSelect = (value: string) => {
    if (question.multiSelect) {
      const newSelection = multiSelected.includes(value)
        ? multiSelected.filter((v) => v !== value)
        : [...multiSelected, value]
      setMultiSelected(newSelection)
      onSelect(newSelection)
    } else {
      onSelect(value)
    }
  }

  const isSelected = (value: string) => {
    if (question.multiSelect) {
      return multiSelected.includes(value)
    }
    return selectedValue === value
  }

  return (
    <>
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <p className="text-[13px] text-muted-foreground/70">
          {question.multiSelect ? 'Select multiple answers' : 'Answer the question'}
        </p>
        <h3 className="mt-1 text-[15px] font-medium leading-snug text-foreground">
          {question.question}
        </h3>
      </div>

      {/* Options */}
      <div className="px-5 pb-3 space-y-1">
        {question.options.map((option) => {
          const selected = isSelected(option.value)
          return (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className="group flex w-full items-start gap-3 rounded-lg py-2 text-left transition-colors hover:bg-muted/40"
            >
              <span
                className={cn(
                  'mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full transition-colors',
                  selected
                    ? 'bg-foreground'
                    : 'bg-muted-foreground/30 group-hover:bg-muted-foreground/50'
                )}
              />
              <span
                className={cn(
                  'text-[14px] leading-snug transition-colors',
                  selected
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                {option.label}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}

export function ClarifyingQuestions({
  questions,
  answers,
  onAnswer,
  onComplete,
  isLoading = false,
}: ClarifyingQuestionsProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentQuestion = questions[currentIndex]

  const currentAnswer = answers.find(
    (a) => a.questionId === currentQuestion?.id
  )

  const handleSelect = (value: string | string[]) => {
    onAnswer({
      questionId: currentQuestion.id,
      value,
    })
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      onComplete()
    }
  }

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const isCurrentAnswered = !!currentAnswer?.value && (
    Array.isArray(currentAnswer.value)
      ? currentAnswer.value.length > 0
      : currentAnswer.value.length > 0
  )

  const isLastQuestion = currentIndex === questions.length - 1

  const progress = questions.length
    ? ((currentIndex + 1) / questions.length) * 100
    : 0

  return (
    <div className="bg-card rounded-2xl ring-1 ring-border/20 overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Current question */}
      {currentQuestion && (
        <QuestionCard
          key={currentQuestion.id}
          question={currentQuestion}
          selectedValue={currentAnswer?.value}
          onSelect={handleSelect}
        />
      )}

      {/* Footer */}
      <div className="px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={handleBack}
            disabled={currentIndex === 0}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            disabled
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleNext}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            Skip all
          </button>
          <button
            onClick={handleNext}
            disabled={!isCurrentAnswered || isLoading}
            className={cn(
              'flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium',
              'bg-primary text-primary-foreground transition-colors hover:bg-primary/90',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating plan...
              </>
            ) : isLastQuestion ? (
              'Submit'
            ) : (
              'Next'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
