"use client";

import { useState, useCallback } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InsurelyCompany } from "@/types/insurely";

interface PersonalNumberInputProps {
  company: InsurelyCompany;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

// Format personal number as YYYYMMDD-XXXX
function formatPersonalNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 8) {
    return digits;
  }
  return `${digits.slice(0, 8)}-${digits.slice(8, 12)}`;
}

// Validate Swedish personal number
function isValidPersonalNumber(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length === 12 || digits.length === 10;
}

export function PersonalNumberInput({
  company,
  value,
  onChange,
  onSubmit,
  onBack,
  isLoading = false,
}: PersonalNumberInputProps) {
  const [touched, setTouched] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, "").slice(0, 12);
      onChange(raw);
    },
    [onChange]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setTouched(true);
      if (isValidPersonalNumber(value)) {
        onSubmit();
      }
    },
    [value, onSubmit]
  );

  const isValid = isValidPersonalNumber(value);
  const showError = touched && !isValid && value.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Header with bank info */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
          aria-label="Tillbaka"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-[14px] font-medium">{company.displayName}</span>
      </div>

      {/* Personal number input */}
      <div className="space-y-2">
        <label
          htmlFor="personal-number"
          className="block text-[13px] text-muted-foreground"
        >
          Personnummer
        </label>
        <input
          id="personal-number"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="ÅÅÅÅMMDD-XXXX"
          value={formatPersonalNumber(value)}
          onChange={handleChange}
          onBlur={() => setTouched(true)}
          disabled={isLoading}
          className={cn(
            "w-full px-4 py-3 rounded-xl",
            "bg-secondary/50 border",
            "text-[15px] font-mono",
            "placeholder:text-muted-foreground/50",
            "focus:outline-none focus:ring-2 focus:ring-primary/50",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            showError ? "border-destructive" : "border-transparent"
          )}
        />
        {showError && (
          <p className="text-[12px] text-destructive">
            Ange ett giltigt personnummer (12 siffror)
          </p>
        )}
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isLoading || !isValid}
        className={cn(
          "w-full flex items-center justify-center gap-2",
          "px-4 py-3 rounded-xl",
          "bg-primary text-primary-foreground",
          "text-[14px] font-medium",
          "hover:bg-primary/90 transition-colors",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Ansluter...</span>
          </>
        ) : (
          <>
            <span>Fortsätt med BankID</span>
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      {/* Security note */}
      <p className="text-[11px] text-muted-foreground/70 text-center">
        Din data hanteras säkert via Insurely. Vi lagrar aldrig dina bankuppgifter.
      </p>
    </form>
  );
}
