"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Load from environment variables
const INSURELY_CONFIG = {
  customerId: process.env.NEXT_PUBLIC_INSURELY_CUSTOMER_ID || "YOUR_CUSTOMER_ID",
  configName: process.env.NEXT_PUBLIC_INSURELY_CONFIG_NAME || "YOUR_CONFIG_NAME",
};

interface InsurelyEmbedProps {
  customerId?: string;
  configName?: string;
  language?: "en" | "sv" | "da" | "fr" | "et";
  onComplete?: (data: unknown) => void;
  onSkip?: () => void;
  onDemoData?: () => void;
}

// Insurely postMessage event types
type InsurelyEventName =
  | "APP_LOADED"
  | "PAGE_VIEW"
  | "SELECTED_AUTHENTICATION_METHOD"
  | "COLLECTION_GROUP_CREATED"
  | "COLLECTION_ID"
  | "RESULTS"
  | "COLLECTION_STATUS"
  | "COLLECTION_GROUP_ENDED";

interface InsurelyEvent {
  origin: string;
  name: InsurelyEventName;
  value?: unknown;
}

export function InsurelyEmbed({
  customerId = INSURELY_CONFIG.customerId,
  configName = INSURELY_CONFIG.configName,
  language = "sv",
  onComplete,
  onSkip,
  onDemoData,
}: InsurelyEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const appLoadedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [configReady, setConfigReady] = useState(false);

  // Check if using placeholder credentials
  const isPlaceholder =
    customerId === "YOUR_CUSTOMER_ID" || configName === "YOUR_CONFIG_NAME";

  // Handle postMessage events from Insurely iframe
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      // Debug: log all postMessages to understand what's being received
      console.log("postMessage received:", event.origin, event.data);

      // Only handle messages from Insurely
      if (!event.origin.includes("insurely.com")) return;

      const data = event.data as InsurelyEvent;

      switch (data.name) {
        case "APP_LOADED":
          appLoadedRef.current = true;
          setIsLoading(false);
          setStatus(null);
          break;
        case "COLLECTION_STATUS":
          // Show status to user
          if (typeof data.value === "string") {
            const statusMap: Record<string, string> = {
              RUNNING: "Ansluter...",
              LOGIN: "Loggar in...",
              TWO_FACTOR_PENDING: "Väntar på BankID...",
              COLLECTING: "Hämtar data...",
              COMPLETED: "Klart!",
              COMPLETED_PARTIAL: "Delvis klart",
              FAILED: "Något gick fel",
              INCORRECT_CREDENTIALS: "Felaktiga uppgifter",
              AUTHENTICATION_TIMEOUT: "Tiden gick ut",
            };
            setStatus(statusMap[data.value] || data.value);
          }
          break;
        case "RESULTS":
          // Insurance/loan data collected
          onComplete?.(data.value);
          break;
        case "COLLECTION_GROUP_ENDED":
          if (data.value === "success") {
            setStatus("Data hämtad!");
          } else {
            setError("Kunde inte hämta data. Försök igen.");
          }
          break;
      }
    },
    [onComplete]
  );

  useEffect(() => {
    if (isPlaceholder) {
      setIsLoading(false);
      return;
    }

    // Set up Insurely config on window object (required before iframe loads)
    (window as Window & { insurely?: { config: object } }).insurely = {
      config: {
        customerId,
        configName,
        language,
      },
    };

    // Load the Insurely bootstrap script (required for iframe communication)
    const existingScript = document.getElementById("insurely-bootstrap");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "insurely-bootstrap";
      script.src = "https://blocks.insurely.com/assets/bootstrap.js";
      script.type = "text/javascript";
      script.onload = () => {
        console.log("Insurely bootstrap script loaded");
        setConfigReady(true);
      };
      script.onerror = () => {
        console.error("Failed to load Insurely bootstrap script");
        setError("Kunde inte ladda Insurely. Försök igen senare.");
        setIsLoading(false);
      };
      document.head.appendChild(script);
    } else {
      // Script already loaded, just mark ready
      setConfigReady(true);
    }

    // Listen for postMessage events from iframe
    window.addEventListener("message", handleMessage);

    // Set loading to false after a timeout, show error if APP_LOADED never fired
    const timeout = setTimeout(() => {
      setIsLoading(false);
      if (!appLoadedRef.current) {
        setError("Insurely kunde inte laddas. Kontrollera att din URL är vitlistad hos Insurely.");
      }
    }, 15000);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearTimeout(timeout);
      setConfigReady(false);
    };
  }, [customerId, configName, language, handleMessage, isPlaceholder]);

  // Insurely iframe URL - config is passed via window.insurely, not URL params
  const iframeSrc = "https://blocks.insurely.com/";

  return (
    <div className="bg-card rounded-2xl ring-1 ring-border/20 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <p className="text-[13px] text-muted-foreground/70 mb-1">
          Hämta automatiskt
        </p>
        <h3 className="text-[15px] font-medium text-foreground leading-snug">
          Koppla din bank via Insurely
        </h3>
      </div>

      {/* Content */}
      <div className="px-5 pb-3">
        {isLoading && !isPlaceholder && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              <p className="text-sm text-muted-foreground">Laddar Insurely...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-3 text-center">
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
              <p className="text-sm text-muted-foreground">{error}</p>
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
        )}

        {isPlaceholder && !isLoading && !error && (
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
                Lägg till dina Insurely-uppgifter i .env.local
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
        )}

        {/* Status indicator */}
        {status && !error && (
          <div className="flex items-center justify-center py-2 mb-2">
            <span className="text-sm text-muted-foreground">{status}</span>
          </div>
        )}

        {/* Insurely iframe - only render after config is set on window */}
        {!isPlaceholder && !error && configReady && (
          <iframe
            ref={iframeRef}
            id="insurely-data-aggregation"
            title="Logga in och hämta dina uppgifter"
            src={iframeSrc}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-top-navigation"
            referrerPolicy="origin"
            allow="clipboard-write"
            className={cn(
              "w-full border-0 rounded-lg transition-opacity",
              isLoading ? "h-0 opacity-0" : "h-[400px] opacity-100"
            )}
            onLoad={() => setIsLoading(false)}
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled
            className="p-1.5 text-muted-foreground/40 opacity-30 cursor-not-allowed"
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
              Fyll i manuellt
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
