"use client";

import {
  Home,
  Activity,
  LayoutGrid,
  FileText,
  User,
  Settings,
} from "lucide-react";
import { useMortgageStore, NavItem } from "@/hooks/use-mortgage-store";
import { cn } from "@/lib/utils";

const navItems: { id: NavItem; icon: typeof Home; label: string }[] = [
  { id: "dashboard", icon: Home, label: "Översikt" },
  { id: "loans", icon: LayoutGrid, label: "Lån" },
  { id: "analysis", icon: Activity, label: "Analys" },
  { id: "settings", icon: FileText, label: "Dokument" },
];

function PolyLogo() {
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="1" width="2.5" height="8" rx="1.25" fill="white" />
        <rect x="11.5" y="7" width="2.5" height="8" rx="1.25" fill="white" />
        <rect x="1" y="2" width="8" height="2.5" rx="1.25" fill="white" />
        <rect x="7" y="11.5" width="8" height="2.5" rx="1.25" fill="white" />
      </svg>
    </div>
  );
}

export function IconRail() {
  const { activeNav, setActiveNav } = useMortgageStore();

  return (
    <div className="flex h-full w-11 flex-shrink-0 flex-col items-center border-r bg-sidebar py-3">
      {/* Logo */}
      <div className="mb-4">
        <PolyLogo />
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;

          return (
            <button
              key={item.id}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                isActive ? "bg-muted" : "hover:bg-muted/50"
              )}
              onClick={() => setActiveNav(item.id)}
              title={item.label}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              />
              <span className="sr-only">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom icons */}
      <div className="mt-auto flex flex-col gap-0.5">
        <button
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted/50"
          title="Profil"
        >
          <User className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted/50"
          title="Inställningar"
        >
          <Settings className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
