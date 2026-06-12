"use client";

import { useEffect } from "react";
import { useInsurely } from "@/hooks/use-insurely";
import { BankSelector } from "./bank-selector";
import { PersonalNumberInput } from "./personal-number-input";
import { BankIdAuth } from "./bankid-auth";
import { CollectionProgress } from "./collection-progress";
import type { InsurelyLoanRaw } from "@/types/insurely";

interface InsurelyConnectProps {
  onComplete?: (loans: InsurelyLoanRaw[]) => void;
  onSkip?: () => void;
  onDemoData?: () => void;
}

export function InsurelyConnect({
  onComplete,
  onSkip,
  onDemoData,
}: InsurelyConnectProps) {
  const {
    state,
    companies,
    selectedCompany,
    personalNumber,
    base64QrCode,
    autoStartToken,
    collectionStatus,
    progress,
    loans,
    error,
    isConfigured,
    loadCompanies,
    selectCompany,
    setPersonalNumber,
    startAuthentication,
    cancelCollection,
    reset,
  } = useInsurely();

  // Load companies on mount
  useEffect(() => {
    if (state === "idle" && isConfigured) {
      loadCompanies();
    }
  }, [state, isConfigured, loadCompanies]);

  // Notify parent when collection completes
  useEffect(() => {
    if (state === "completed") {
      // Small delay to ensure state is settled, then redirect
      const timer = setTimeout(() => {
        onComplete?.(loans);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [state, loans, onComplete]);

  // Render not configured state
  if (!isConfigured) {
    return (
      <div className="bg-card rounded-2xl ring-1 ring-border/20 overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <p className="text-[13px] text-muted-foreground/70 mb-1">
            Hämta automatiskt
          </p>
          <h3 className="text-[15px] font-medium text-foreground leading-snug">
            Koppla din bank via Insurely
          </h3>
        </div>

        <div className="px-4 pb-4">
          <div className="flex flex-col items-center gap-4 text-center py-6">
            <div className="p-4 rounded-full bg-muted">
              <svg
                className="h-8 w-8 text-muted-foreground"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <p className="text-[14px] font-medium text-foreground mb-1">
                Insurely inte konfigurerat
              </p>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Lägg till INSURELY_API_KEY i .env.local
              </p>
            </div>
            {onDemoData && (
              <button
                type="button"
                onClick={onDemoData}
                className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-[14px] font-medium hover:bg-primary/90 transition-colors"
              >
                Testa med demodata
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 flex items-center justify-end">
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Fyll i manuellt
            </button>
          )}
        </div>
      </div>
    );
  }

  // Render error state
  if (state === "error") {
    return (
      <div className="bg-card rounded-2xl ring-1 ring-border/20 overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <p className="text-[13px] text-muted-foreground/70 mb-1">
            Hämta automatiskt
          </p>
          <h3 className="text-[15px] font-medium text-foreground leading-snug">
            Koppla din bank via Insurely
          </h3>
        </div>

        <div className="px-4 pb-4">
          <div className="flex flex-col items-center gap-4 text-center py-6">
            <div className="p-3 rounded-full bg-destructive/10">
              <svg
                className="h-5 w-5 text-destructive"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="text-[14px] text-muted-foreground">{error}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={reset}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-[14px] font-medium hover:bg-primary/90 transition-colors"
              >
                Försök igen
              </button>
              {onDemoData && (
                <button
                  type="button"
                  onClick={onDemoData}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-[14px] font-medium hover:bg-secondary/80 transition-colors"
                >
                  Använd demodata
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 flex items-center justify-end">
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Fyll i manuellt
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl ring-1 ring-border/20 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <p className="text-[13px] text-muted-foreground/70 mb-1">
          Hämta automatiskt
        </p>
        <h3 className="text-[15px] font-medium text-foreground leading-snug">
          {state === "selecting-bank" && "Välj din bank"}
          {state === "entering-personal-number" && "Logga in"}
          {state === "authenticating" && "BankID"}
          {state === "collecting" && "Hämtar data"}
          {state === "completed" && "Klart!"}
          {(state === "idle" || state === "loading-banks") && "Koppla din bank via Insurely"}
        </h3>
      </div>

      {/* Content */}
      <div className="px-4 pb-4 max-h-[500px] overflow-y-auto">
        {/* Loading state */}
        {(state === "idle" || state === "loading-banks") && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              <p className="text-sm text-muted-foreground">Laddar banker...</p>
            </div>
          </div>
        )}

        {/* Bank selector */}
        {state === "selecting-bank" && (
          <BankSelector companies={companies} onSelect={selectCompany} />
        )}

        {/* Personal number input */}
        {state === "entering-personal-number" && selectedCompany && (
          <PersonalNumberInput
            company={selectedCompany}
            value={personalNumber}
            onChange={setPersonalNumber}
            onSubmit={startAuthentication}
            onBack={reset}
          />
        )}

        {/* BankID authentication */}
        {state === "authenticating" && (
          <BankIdAuth
            base64QrCode={base64QrCode}
            autoStartToken={autoStartToken}
            status={collectionStatus}
            onCancel={cancelCollection}
          />
        )}

        {/* Collection progress */}
        {(state === "collecting" || state === "completed") && (
          <CollectionProgress
            status={collectionStatus}
            progress={progress}
            loanCount={loans.length}
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {/* Empty space for alignment */}
        </div>

        <div className="flex items-center gap-3">
          {onDemoData && (state === "selecting-bank" || state === "idle" || state === "loading-banks") && (
            <button
              type="button"
              onClick={onDemoData}
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Testa med demodata
            </button>
          )}
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Fyll i manuellt
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
