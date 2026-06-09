"use client";

import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolStatusProps {
  toolName: string;
  status: "pending" | "executing" | "complete" | "error";
  result?: string;
  className?: string;
}

const toolLabels: Record<string, string> = {
  calculateLTV: "Beräknar belåningsgrad",
  suggestAmortization: "Analyserar amorteringskrav",
  compareBankRates: "Jämför bankräntor",
  askUser: "Väntar på svar",
};

export function ToolStatus({
  toolName,
  status,
  result,
  className,
}: ToolStatusProps) {
  const label = toolLabels[toolName] || toolName;

  return (
    <div
      className={cn(
        "flex items-center gap-2 py-2 px-3 rounded-xl text-sm",
        status === "executing" && "bg-primary/5 text-primary",
        status === "complete" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
        status === "error" && "bg-destructive/10 text-destructive",
        status === "pending" && "bg-muted/50 text-muted-foreground",
        className
      )}
    >
      {status === "executing" && (
        <Loader2 className="h-4 w-4 animate-spin" />
      )}
      {status === "complete" && <Check className="h-4 w-4" />}
      {status === "pending" && (
        <div className="h-4 w-4 rounded-full border-2 border-current opacity-30" />
      )}
      {status === "error" && (
        <span className="h-4 w-4 text-center leading-4">!</span>
      )}

      <span className="flex-1">{label}</span>

      {result && status === "complete" && (
        <span className="text-xs opacity-70 truncate max-w-[150px]">
          {result}
        </span>
      )}
    </div>
  );
}

interface ToolStatusListProps {
  tools: Array<{
    name: string;
    status: "pending" | "executing" | "complete" | "error";
    result?: string;
  }>;
  className?: string;
}

export function ToolStatusList({ tools, className }: ToolStatusListProps) {
  if (tools.length === 0) return null;

  return (
    <div className={cn("space-y-1", className)}>
      {tools.map((tool, index) => (
        <ToolStatus
          key={`${tool.name}-${index}`}
          toolName={tool.name}
          status={tool.status}
          result={tool.result}
        />
      ))}
    </div>
  );
}
