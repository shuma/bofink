"use client";

import { useMemo } from "react";
import { Smartphone, X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CollectionStatus } from "@/types/insurely";

interface BankIdAuthProps {
  base64QrCode: string | null;
  autoStartToken: string | null;
  status: CollectionStatus | null;
  onCancel: () => void;
}

// Status messages in Swedish
const STATUS_MESSAGES: Record<string, string> = {
  CREATED: "Förbereder BankID...",
  LOGIN: "Öppna BankID-appen...",
  TWO_FACTOR_PENDING: "Skriv in din säkerhetskod i BankID-appen",
  RUNNING: "Ansluter...",
  COLLECTING: "Hämtar dina uppgifter...",
};

export function BankIdAuth({
  base64QrCode,
  autoStartToken,
  status,
  onCancel,
}: BankIdAuthProps) {
  // BankID app deep link
  const bankIdLink = useMemo(() => {
    if (!autoStartToken) return null;
    return `bankid:///?autostarttoken=${autoStartToken}&redirect=null`;
  }, [autoStartToken]);

  const statusMessage = status ? STATUS_MESSAGES[status] || "Väntar..." : "Väntar...";

  // Ensure the base64 QR code has the proper data URL prefix
  const qrCodeSrc = useMemo(() => {
    if (!base64QrCode) return null;
    // If it already has a data URL prefix, use it as-is
    if (base64QrCode.startsWith("data:")) {
      return base64QrCode;
    }
    // Otherwise, assume it's a PNG image
    return `data:image/png;base64,${base64QrCode}`;
  }, [base64QrCode]);

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Cancel button */}
      <div className="w-full flex justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="p-2 rounded-lg hover:bg-secondary/50 transition-colors text-muted-foreground"
          aria-label="Avbryt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* QR Code */}
      {qrCodeSrc ? (
        <div className="p-4 bg-white rounded-xl">
          <img
            src={qrCodeSrc}
            alt="BankID QR-kod"
            width={180}
            height={180}
            className="w-[180px] h-[180px]"
          />
        </div>
      ) : (
        <div className="w-[180px] h-[180px] bg-secondary/50 rounded-xl flex items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      )}

      {/* Status message */}
      <div className="text-center space-y-2">
        <p className="text-[14px] font-medium text-foreground">
          {statusMessage}
        </p>
        <p className="text-[13px] text-muted-foreground">
          Skanna QR-koden med BankID-appen
        </p>
      </div>

      {/* Mobile BankID link */}
      {bankIdLink && (
        <a
          href={bankIdLink}
          className={cn(
            "flex items-center gap-2",
            "px-4 py-2.5 rounded-xl",
            "bg-secondary/50 hover:bg-secondary/80",
            "text-[13px] text-muted-foreground",
            "transition-colors"
          )}
        >
          <Smartphone className="h-4 w-4" />
          <span>Öppna BankID på denna enhet</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      )}

      {/* Help text */}
      <p className="text-[11px] text-muted-foreground/70 text-center max-w-[250px]">
        Har du inte BankID-appen? Ladda ner den från App Store eller Google Play.
      </p>
    </div>
  );
}
