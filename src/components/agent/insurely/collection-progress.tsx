"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CollectionStatus } from "@/types/insurely";

interface CollectionProgressProps {
  status: CollectionStatus | null;
  progress: number;
  loanCount?: number;
}

// Status messages in Swedish
const STATUS_MESSAGES: Record<string, string> = {
  RUNNING: "Ansluter till banken...",
  LOGIN: "Loggar in...",
  COLLECTING: "Hämtar dina lån...",
  COMPLETED: "Klart!",
  COMPLETED_PARTIAL: "Hämtade tillgängliga lån",
};

export function CollectionProgress({
  status,
  progress,
  loanCount = 0,
}: CollectionProgressProps) {
  const isComplete = status === "COMPLETED" || status === "COMPLETED_PARTIAL";
  const statusMessage = status
    ? STATUS_MESSAGES[status] || "Hämtar data..."
    : "Hämtar data...";

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Icon */}
      <div
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center",
          isComplete ? "bg-green-100" : "bg-secondary/50"
        )}
      >
        {isComplete ? (
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        ) : (
          <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Status text */}
      <div className="text-center space-y-1">
        <p className="text-[15px] font-medium text-foreground">
          {statusMessage}
        </p>
        {isComplete && loanCount > 0 && (
          <p className="text-[13px] text-muted-foreground">
            Hittade {loanCount} lån
          </p>
        )}
      </div>

      {/* Progress bar */}
      {!isComplete && (
        <div className="w-full max-w-[200px]">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${Math.max(progress, 10)}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground/70 text-center mt-2">
            {progress > 0 ? `${Math.round(progress)}%` : "Vänta..."}
          </p>
        </div>
      )}
    </div>
  );
}
