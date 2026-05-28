"use client";

import { Home, TrendingDown, Percent } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useMortgageStore } from "@/hooks/use-mortgage-store";
import { useCalculations } from "@/hooks/use-calculations";
import { formatSEK } from "@/lib/formatters";

// OKLCH colors from DESIGN.md tokens
const COLORS = {
  blue: "oklch(0.6 0.18 250)",      // Calm Blue (primary)
  red: "oklch(0.62 0.2 25)",        // Soft Red (destructive)
  amber: "oklch(0.7 0.15 85)",      // Warm amber
  green: "oklch(0.6 0.15 145)",     // Soft green
} as const;

export function PropertyOverviewCard() {
  const { boVarde, inkomst } = useMortgageStore();
  const { totalDebt, ltv, debtRatio } = useCalculations();

  const items = [
    {
      icon: Home,
      label: "Bostadens värde",
      value: formatSEK(boVarde),
      color: COLORS.blue,
    },
    {
      icon: TrendingDown,
      label: "Total skuld",
      value: formatSEK(totalDebt),
      color: COLORS.red,
    },
    {
      icon: Percent,
      label: "Belåningsgrad",
      value: `${ltv.toFixed(1)}%`,
      subtitle: ltv > 70 ? "Över 70%" : ltv > 50 ? "50-70%" : "Under 50%",
      color: ltv > 70 ? COLORS.red : ltv > 50 ? COLORS.amber : COLORS.green,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Fastighet</CardTitle>
            <CardDescription>Översikt av din bostad</CardDescription>
          </div>
          {inkomst > 0 && (
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Skuldkvot</div>
              <div className="font-heading text-xl font-semibold tabular-nums">
                {debtRatio.toFixed(1)}x
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-colors"
              style={{ backgroundColor: `color-mix(in oklch, ${item.color} 12%, transparent)` }}
            >
              <item.icon
                className="h-5 w-5"
                style={{ color: item.color }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm text-muted-foreground">{item.label}</div>
              {item.subtitle && (
                <div className="text-xs text-muted-foreground/80">{item.subtitle}</div>
              )}
            </div>
            <div className="text-sm font-medium tabular-nums">{item.value}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
