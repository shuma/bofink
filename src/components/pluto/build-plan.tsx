'use client'

import { useState } from 'react'
import { Check, Code, Terminal, Settings, ArrowRight, Edit3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { BuildPlan, BuildPlanStep } from '@/types/pluto'

interface BuildPlanProps {
  plan: BuildPlan
  onApprove: () => void
  onEdit: () => void
  isLoading?: boolean
}

function StepIcon({ type }: { type: BuildPlanStep['type'] }) {
  switch (type) {
    case 'file':
      return <Code className="h-3 w-3" />
    case 'command':
      return <Terminal className="h-3 w-3" />
    case 'config':
      return <Settings className="h-3 w-3" />
    default:
      return <Check className="h-3 w-3" />
  }
}

export function BuildPlanDisplay({
  plan,
  onApprove,
  onEdit,
  isLoading = false,
}: BuildPlanProps) {
  const [showAllSteps, setShowAllSteps] = useState(false)

  const displayedSteps = showAllSteps ? plan.steps : plan.steps.slice(0, 5)
  const hasMoreSteps = plan.steps.length > 5

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-heading font-semibold text-foreground">
          {plan.name}
        </h2>
        <p className="text-muted-foreground">{plan.description}</p>
      </div>

      {/* Features */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground uppercase tracking-wide">
          Features
        </h3>
        <div className="flex flex-wrap gap-2">
          {plan.features.map((feature, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="px-3 py-1.5 text-sm"
            >
              {feature}
            </Badge>
          ))}
        </div>
      </div>

      {/* Tech Stack */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground uppercase tracking-wide">
          Tech Stack
        </h3>
        <div className="flex flex-wrap gap-2">
          {plan.techStack.map((tech, index) => (
            <Badge
              key={index}
              variant="outline"
              className="px-3 py-1.5 text-sm"
            >
              {tech}
            </Badge>
          ))}
        </div>
      </div>

      {/* Build Steps */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground uppercase tracking-wide">
          Build Steps ({plan.steps.length})
        </h3>
        <div className="space-y-2">
          {displayedSteps.map((step) => (
            <div
              key={step.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-xl',
                'bg-card ring-1 ring-border/20'
              )}
            >
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 ring-border/40 text-muted-foreground">
                <StepIcon type={step.type} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-foreground">{step.title}</span>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {step.description}
                </p>
              </div>
            </div>
          ))}

          {hasMoreSteps && !showAllSteps && (
            <button
              onClick={() => setShowAllSteps(true)}
              className="w-full p-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Show {plan.steps.length - 5} more steps...
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onEdit}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-xl"
        >
          <Edit3 className="h-4 w-4" />
          Edit Plan
        </Button>
        <Button
          onClick={onApprove}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl"
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Starting build...
            </>
          ) : (
            <>
              Start Building
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
