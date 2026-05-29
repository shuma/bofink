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
    <div className="view-switcher-track flex items-center rounded-full p-0.5">
      {views.map((view, index) => {
        const isActive = viewMode === view.id;
        const Icon = view.icon;
        const nextView = views[index + 1];
        const showDivider = !isActive && nextView && viewMode !== nextView.id;

        return (
          <div key={view.id} className="flex items-center">
            <button
              onClick={() => setViewMode(view.id)}
              className={cn(
                "relative flex items-center gap-1.5 rounded-full text-xs font-medium transition-all duration-150",
                isActive
                  ? "view-switcher-pill px-2.5 py-1 text-primary"
                  : "px-2 py-1 text-muted-foreground hover:text-foreground"
              )}
              aria-label={view.label}
              aria-pressed={isActive}
            >
              <Icon className="h-3.5 w-3.5" />
              {isActive && (
                <span className="animate-in fade-in-0 slide-in-from-left-1 duration-150">
                  {view.label}
                </span>
              )}
            </button>
            {showDivider && <div className="mx-0.5 h-3 w-px bg-border/60" />}
          </div>
        );
      })}
    </div>
  );
}
