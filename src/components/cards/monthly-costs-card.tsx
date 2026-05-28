"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useCalculations } from "@/hooks/use-calculations";
import { formatSEK } from "@/lib/formatters";

// OKLCH colors from DESIGN.md tokens
const COLORS = {
  blue: "oklch(0.6 0.18 250)",      // Calm Blue (primary)
  red: "oklch(0.62 0.2 25)",        // Soft Red
  green: "oklch(0.6 0.15 145)",     // Soft green
} as const;

export function MonthlyCostsCard() {
  const {
    monthlyInterestGross,
    monthlyInterestNet,
    monthlyAmortization,
    monthlyNetTotal,
  } = useCalculations();

  const totalGross = monthlyInterestGross + monthlyAmortization;
  const taxSavings = monthlyInterestGross - monthlyInterestNet;

  const items = [
    {
      label: "Ränta (brutto)",
      value: monthlyInterestGross,
      percentage: totalGross > 0 ? (monthlyInterestGross / totalGross) * 100 : 0,
      color: COLORS.red,
    },
    {
      label: "Ränteavdrag",
      value: -taxSavings,
      percentage: totalGross > 0 ? (taxSavings / totalGross) * 100 : 0,
      color: COLORS.green,
      isNegative: true,
    },
    {
      label: "Amortering",
      value: monthlyAmortization,
      percentage: totalGross > 0 ? (monthlyAmortization / totalGross) * 100 : 0,
      color: COLORS.blue,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Månadskostnad</CardTitle>
            <CardDescription>Efter ränteavdrag</CardDescription>
          </div>
          <div className="text-right">
            <div className="font-heading text-xl font-semibold tabular-nums">
              {formatSEK(monthlyNetTotal)}
            </div>
            <div className="text-xs text-muted-foreground">per månad</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span
                className="text-sm font-medium tabular-nums"
                style={{ color: item.isNegative ? COLORS.green : undefined }}
              >
                {item.isNegative ? "−" : ""}
                {formatSEK(Math.abs(item.value))}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(item.percentage, 100)}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
