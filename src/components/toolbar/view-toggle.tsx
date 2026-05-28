"use client";

import { Globe, FileText, Code, Layers } from "lucide-react";
import { useMortgageStore, ViewMode } from "@/hooks/use-mortgage-store";
import { cn } from "@/lib/utils";

const views: { id: ViewMode; icon: typeof Globe; label: string }[] = [
  { id: "preview", icon: Globe, label: "Översikt" },
  { id: "data", icon: FileText, label: "Data" },
  { id: "code", icon: Code, label: "Kod" },
  { id: "layers", icon: Layers, label: "Lager" },
];

export function ViewToggle() {
  const { viewMode, setViewMode } = useMortgageStore();

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-border/60 bg-muted/30 p-1">
      {views.map((view) => {
        const isActive = viewMode === view.id;
        const Icon = view.icon;

        return (
          <button
            key={view.id}
            onClick={() => setViewMode(view.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-label={view.label}
            aria-pressed={isActive}
          >
            <Icon className="h-4 w-4" />
            {isActive && <span className="text-sm">{view.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
