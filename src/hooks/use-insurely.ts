"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  InsurelyCompany,
  CollectionStatus,
  InsurelyLoanRaw,
} from "@/types/insurely";

export type InsurelyFlowState =
  | "idle"
  | "loading-banks"
  | "selecting-bank"
  | "entering-personal-number"
  | "authenticating"
  | "collecting"
  | "completed"
  | "error";

export interface UseInsurelyResult {
  // State
  state: InsurelyFlowState;
  companies: InsurelyCompany[];
  selectedCompany: InsurelyCompany | null;
  personalNumber: string;
  base64QrCode: string | null;
  autoStartToken: string | null;
  collectionStatus: CollectionStatus | null;
  progress: number;
  loans: InsurelyLoanRaw[];
  error: string | null;
  isConfigured: boolean;

  // Actions
  loadCompanies: () => Promise<void>;
  selectCompany: (company: InsurelyCompany) => void;
  setPersonalNumber: (value: string) => void;
  startAuthentication: () => Promise<void>;
  cancelCollection: () => void;
  reset: () => void;
}

const POLL_INTERVAL = 2000; // 2 seconds

export function useInsurely(): UseInsurelyResult {
  const [state, setState] = useState<InsurelyFlowState>("idle");
  const [companies, setCompanies] = useState<InsurelyCompany[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<InsurelyCompany | null>(null);
  const [personalNumber, setPersonalNumber] = useState("");
  const [base64QrCode, setBase64QrCode] = useState<string | null>(null);
  const [autoStartToken, setAutoStartToken] = useState<string | null>(null);
  const [collectionStatus, setCollectionStatus] = useState<CollectionStatus | null>(null);
  const [progress, setProgress] = useState(0);
  const [loans, setLoans] = useState<InsurelyLoanRaw[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(async (sid: string) => {
    try {
      const response = await fetch(`/api/insurely/status/${sid}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get status");
      }

      setCollectionStatus(data.status);

      // Update QR code if available
      if (data.bankId?.base64QrCode) {
        setBase64QrCode(data.bankId.base64QrCode);
      }
      if (data.bankId?.autoStartToken) {
        setAutoStartToken(data.bankId.autoStartToken);
      }

      // Update progress
      if (data.progress !== undefined) {
        setProgress(data.progress);
      }

      // Handle different statuses
      switch (data.status) {
        case "TWO_FACTOR_PENDING":
        case "LOGIN":
          setState("authenticating");
          break;

        case "COLLECTING":
        case "RUNNING":
          setState("collecting");
          break;

        case "COMPLETED":
        case "COMPLETED_PARTIAL":
          stopPolling();
          setProgress(100);
          // Set loans BEFORE state so the effect has the correct data
          if (data.loans) {
            setLoans(data.loans);
          }
          setState("completed");
          break;

        case "FAILED":
        case "INCORRECT_CREDENTIALS":
        case "AUTHENTICATION_TIMEOUT":
        case "CANCELLED":
          stopPolling();
          setState("error");
          setError(getStatusMessage(data.status));
          break;
      }
    } catch (err) {
      console.error("Error polling status:", err);
      // Don't stop polling on transient errors, but limit retries
    }
  }, [stopPolling]);

  const loadCompanies = useCallback(async () => {
    setState("loading-banks");
    setError(null);

    try {
      const response = await fetch("/api/insurely/companies");
      const data = await response.json();

      if (!response.ok) {
        if (data.code === "NOT_CONFIGURED") {
          setIsConfigured(false);
          setState("idle");
          return;
        }
        throw new Error(data.error || "Failed to load banks");
      }

      setCompanies(data.companies);
      setState("selecting-bank");
    } catch (err) {
      console.error("Error loading companies:", err);
      setError("Kunde inte ladda banker. Försök igen.");
      setState("error");
    }
  }, []);

  const selectCompany = useCallback((company: InsurelyCompany) => {
    setSelectedCompany(company);
    setState("entering-personal-number");
  }, []);

  const startAuthentication = useCallback(async () => {
    if (!selectedCompany || !personalNumber) {
      setError("Välj bank och ange personnummer");
      return;
    }

    setState("authenticating");
    setError(null);

    // Select the best login method from the company's available methods
    // Prefer OTHER_DEVICE variants for QR code flow
    const loginMethods = selectedCompany.loginMethods || [];
    const preferredMethods = [
      "SWEDISH_MOBILE_BANKID_OTHER_DEVICE",
      "SWEDISH_MOBILE_BANKID_OTHER_DEVICE_MOCK", // For test companies
      "SWEDISH_MOBILE_BANKID_ANY_DEVICE",
      "SWEDISH_MOBILE_BANKID",
    ];
    const loginMethod = preferredMethods.find((m) => loginMethods.includes(m)) || loginMethods[0];

    try {
      const response = await fetch("/api/insurely/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: selectedCompany.id,
          personalNumber,
          loginMethod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const details = data.details ? `: ${data.details}` : "";
        throw new Error((data.error || "Failed to initiate collection") + details);
      }

      setSessionId(data.sessionId);
      setCollectionStatus(data.status);

      if (data.bankId?.base64QrCode) {
        setBase64QrCode(data.bankId.base64QrCode);
      }
      if (data.bankId?.autoStartToken) {
        setAutoStartToken(data.bankId.autoStartToken);
      }

      // Start polling for status updates
      pollIntervalRef.current = setInterval(() => {
        pollStatus(data.sessionId);
      }, POLL_INTERVAL);
    } catch (err) {
      console.error("Error starting authentication:", err);
      setError("Kunde inte starta autentisering. Försök igen.");
      setState("error");
    }
  }, [selectedCompany, personalNumber, pollStatus]);

  const cancelCollection = useCallback(() => {
    stopPolling();
    // Note: We could also call an API to cancel server-side
    reset();
  }, [stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setState("idle");
    setSelectedCompany(null);
    setPersonalNumber("");
    setBase64QrCode(null);
    setAutoStartToken(null);
    setCollectionStatus(null);
    setProgress(0);
    setLoans([]);
    setError(null);
    setSessionId(null);
  }, [stopPolling]);

  return {
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
  };
}

function getStatusMessage(status: CollectionStatus): string {
  const messages: Record<string, string> = {
    FAILED: "Något gick fel. Försök igen.",
    INCORRECT_CREDENTIALS: "Felaktiga uppgifter. Kontrollera ditt personnummer.",
    AUTHENTICATION_TIMEOUT: "Tiden gick ut. Försök igen.",
    CANCELLED: "Inloggningen avbröts.",
  };
  return messages[status] || "Ett fel uppstod.";
}
