"use client";

import { Check, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/agents/plan-schema";

interface PlanDisplayProps {
  plan: Plan;
  currentStep: number;
  className?: string;
}

export function PlanDisplay({ plan, currentStep, className }: PlanDisplayProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h3 className="font-heading text-sm font-medium">Plan</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{plan.summary}</p>
      </div>

      <div className="space-y-1">
        {plan.steps.map((step, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;
          const isPending = index > currentStep;

          return (
            <div
              key={index}
              className={cn(
                "flex items-start gap-2 py-1.5 px-2 rounded-lg transition-colors",
                isCurrent && "bg-primary/5"
              )}
            >
              <div className="mt-0.5">
                {isComplete ? (
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-2.5 w-2.5" />
                  </div>
                ) : isCurrent ? (
                  <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-primary">
                    <Loader2 className="h-2.5 w-2.5 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="flex h-4 w-4 items-center justify-center rounded-full border border-muted-foreground/30">
                    <Circle className="h-2 w-2 text-muted-foreground/30" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-xs leading-relaxed",
                    isComplete && "text-muted-foreground line-through",
                    isCurrent && "text-foreground font-medium",
                    isPending && "text-muted-foreground"
                  )}
                >
                  {step.description}
                </p>
              </div>

              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full shrink-0",
                  step.tool === "askUser"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                )}
              >
                {step.tool === "askUser" ? "Fråga" : "Auto"}
              </span>
            </div>
          );
        })}
      </div>

      {plan.estimatedQuestions > 0 && (
        <p className="text-xs text-muted-foreground">
          ~{plan.estimatedQuestions} frågor att besvara
        </p>
      )}
    </div>
  );
}
