"use client";

import { Home, TrendingDown, Percent } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useMortgageStore } from "@/hooks/use-mortgage-store";
import { useCalculations } from "@/hooks/use-calculations";
import { formatSEK } from "@/lib/formatters";

// Restrained, monochrome-blue palette from DESIGN.md
const COLORS = {
  primary: "oklch(0.6 0.18 250)",   // Calm Blue (primary)
  light: "oklch(0.78 0.11 250)",    // Light blue
  quiet: "oklch(0.62 0.04 255)",    // Quiet slate-blue
} as const;

export function PropertyOverviewCard() {
  const { boVarde, inkomst } = useMortgageStore();
  const { totalDebt, ltv, debtRatio } = useCalculations();

  const items = [
    {
      icon: Home,
      label: "Bostadens värde",
      value: formatSEK(boVarde),
      color: COLORS.primary,
    },
    {
      icon: TrendingDown,
      label: "Total skuld",
      value: formatSEK(totalDebt),
      color: COLORS.light,
    },
    {
      icon: Percent,
      label: "Belåningsgrad",
      value: `${ltv.toFixed(1)}%`,
      color: COLORS.quiet,
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
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: `color-mix(in oklch, ${item.color} 10%, transparent)` }}
            >
              <item.icon
                className="h-[18px] w-[18px]"
                style={{ color: item.color }}
                strokeWidth={2}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm text-muted-foreground/90">{item.label}</div>
            </div>
            <div className="text-sm font-medium tabular-nums">{item.value}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
