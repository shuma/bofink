"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AskUserArgs } from "@/lib/agents/tools/agent-tools";

interface QuestionCardProps {
  question: AskUserArgs;
  onAnswer: (value: string | number | string[]) => void;
  onSkip?: () => void;
  onBack?: () => void;
  canGoBack?: boolean;
  isLast?: boolean;
  questionNumber?: number;
  totalQuestions?: number;
}

export function QuestionCard({
  question,
  onAnswer,
  onSkip,
  onBack,
  canGoBack = false,
  isLast = false,
}: QuestionCardProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [customValue, setCustomValue] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const hasOptions = question.options && question.options.length > 0;
  const allowMultiple = question.allowMultiple ?? false;
  const allowCustom = question.allowCustom ?? true;

  const handleOptionToggle = (value: string) => {
    if (allowMultiple) {
      setSelectedOptions((prev) =>
        prev.includes(value)
          ? prev.filter((v) => v !== value)
          : [...prev, value]
      );
      setShowCustomInput(false);
    } else {
      setSelectedOptions([value]);
      setShowCustomInput(false);
      setCustomValue("");
    }
  };

  const handleCustomSelect = () => {
    setShowCustomInput(true);
    if (!allowMultiple) {
      setSelectedOptions([]);
    }
  };

  const handleSubmit = () => {
    if (showCustomInput && customValue.trim()) {
      const numericFields = [
        "propertyValue",
        "monthlyIncome",
        "loanAmount",
        "interestRate",
        "birthYear",
        "years",
        "amortization",
      ];
      if (numericFields.includes(question.field)) {
        const numValue = parseFloat(customValue.replace(/\s/g, ""));
        if (!isNaN(numValue)) {
          onAnswer(numValue);
          return;
        }
      }
      onAnswer(customValue.trim());
    } else if (selectedOptions.length > 0) {
      if (allowMultiple) {
        onAnswer(selectedOptions);
      } else {
        const value = selectedOptions[0];
        const numericFields = [
          "propertyValue",
          "monthlyIncome",
          "loanAmount",
          "interestRate",
          "birthYear",
          "years",
          "amortization",
        ];
        if (numericFields.includes(question.field)) {
          const numValue = parseFloat(value.replace(/\s/g, ""));
          if (!isNaN(numValue)) {
            onAnswer(numValue);
            return;
          }
        }
        onAnswer(value);
      }
    }
  };

  const canSubmit =
    selectedOptions.length > 0 || (showCustomInput && customValue.trim());

  return (
    <div className="bg-card rounded-2xl ring-1 ring-border/20 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <p className="text-[13px] text-muted-foreground/70 mb-1">
          {allowMultiple && hasOptions ? "Välj flera alternativ" : "Svara på frågan"}
        </p>
        <h3 className="text-[15px] font-medium text-foreground leading-snug">
          {question.question}
        </h3>
      </div>

      {/* Options */}
      <div className="px-5 pb-3 space-y-1">
        {hasOptions &&
          question.options!.map((option) => {
            const isSelected = selectedOptions.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleOptionToggle(option.value)}
                className="w-full flex items-start gap-2.5 py-2 text-left group"
              >
                {/* Bullet point */}
                <span
                  className={cn(
                    "mt-[7px] h-1.5 w-1.5 rounded-full shrink-0 transition-colors",
                    isSelected
                      ? "bg-foreground"
                      : "bg-muted-foreground/30 group-hover:bg-muted-foreground/50"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-[14px] leading-snug transition-colors",
                      isSelected
                        ? "font-medium text-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  >
                    {option.label}
                  </p>
                  {option.description && (
                    <p className="text-[13px] text-muted-foreground/70 mt-0.5 leading-relaxed">
                      {option.description}
                    </p>
                  )}
                </div>
              </button>
            );
          })}

        {/* Custom input option */}
        {allowCustom && (
          <button
            type="button"
            onClick={handleCustomSelect}
            className="w-full flex items-center gap-2.5 py-2 text-left group"
          >
            {/* Bullet point */}
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full shrink-0 transition-colors",
                showCustomInput
                  ? "bg-foreground"
                  : "bg-muted-foreground/30 group-hover:bg-muted-foreground/50"
              )}
            />
            {showCustomInput ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type={question.inputType === "number" ? "number" : "text"}
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  placeholder={question.placeholder || "Skriv ditt svar..."}
                  autoFocus
                  className="flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canSubmit) {
                      handleSubmit();
                    }
                  }}
                />
                {question.unit && (
                  <span className="text-[13px] text-muted-foreground">
                    {question.unit}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-[14px] text-muted-foreground group-hover:text-foreground transition-colors">
                Skriv ditt svar...
              </span>
            )}
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onBack}
            disabled={!canGoBack}
            className="p-1.5 text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Föregående"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled
            className="p-1.5 text-muted-foreground/40 opacity-30 cursor-not-allowed"
            aria-label="Nästa"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Hoppa över
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              "px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors",
              canSubmit
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-primary/40 text-primary-foreground/60 cursor-not-allowed"
            )}
          >
            {isLast ? "Skicka" : "Skicka"}
          </button>
        </div>
      </div>
    </div>
  );
}
