"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useCalculations } from "@/hooks/use-calculations";
import { useMortgageStore } from "@/hooks/use-mortgage-store";
import { formatSEK } from "@/lib/formatters";
import { cn } from "@/lib/utils";

// Restrained, monochrome-blue palette from DESIGN.md (no traffic-light colors)
const COLORS = {
  interest: "oklch(0.78 0.11 250)",   // light blue, the gross interest cost
  amortering: "oklch(0.6 0.18 250)",  // calm blue (primary), principal you keep
  deduction: "oklch(0.62 0.04 255)",  // quiet slate-blue, the deduction
} as const;

export function MonthlyCostsCard() {
  const {
    monthlyInterestGross,
    monthlyInterestNet,
    monthlyAmortization,
    monthlyTotal,
    monthlyNetTotal,
  } = useCalculations();
  const { applyRanteavdrag, setApplyRanteavdrag } = useMortgageStore();

  const taxSavingsMonthly = monthlyInterestGross - monthlyInterestNet;
  const taxSavingsYearly = taxSavingsMonthly * 12;
  const headline = applyRanteavdrag ? monthlyNetTotal : monthlyTotal;

  const items = [
    {
      label: "Ränta",
      value: monthlyInterestGross,
      percentage: monthlyTotal > 0 ? (monthlyInterestGross / monthlyTotal) * 100 : 0,
      color: COLORS.interest,
    },
    ...(applyRanteavdrag
      ? [
          {
            label: "Ränteavdrag",
            value: -taxSavingsMonthly,
            percentage: monthlyTotal > 0 ? (taxSavingsMonthly / monthlyTotal) * 100 : 0,
            color: COLORS.deduction,
            isNegative: true,
          },
        ]
      : []),
    {
      label: "Amortering",
      value: monthlyAmortization,
      percentage: monthlyTotal > 0 ? (monthlyAmortization / monthlyTotal) * 100 : 0,
      color: COLORS.amortering,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Månadskostnad</CardTitle>
            <CardDescription>
              {applyRanteavdrag ? "Efter ränteavdrag" : "Före ränteavdrag"}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="font-heading text-xl font-semibold tabular-nums">
              {formatSEK(headline)}
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
              <span className="text-sm font-medium tabular-nums">
                {item.isNegative ? "−" : ""}
                {formatSEK(Math.abs(item.value))}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(item.percentage, 100)}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        ))}

        {/* Ränteavdrag toggle + context */}
        <div className="mt-4 flex items-start justify-between gap-4 border-t border-border/50 pt-4">
          <div className="min-w-0">
            <div className="text-sm font-medium">Räkna med ränteavdrag</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {applyRanteavdrag
                ? `Avdraget är inräknat, ${formatSEK(taxSavingsMonthly)} per månad.`
                : `Du får tillbaka ca ${formatSEK(taxSavingsYearly)} per år via deklarationen.`}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={applyRanteavdrag}
            aria-label="Räkna med ränteavdrag i månadskostnaden"
            onClick={() => setApplyRanteavdrag(!applyRanteavdrag)}
            className={cn(
              "relative mt-0.5 inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full outline-none transition-colors duration-200 focus-visible:ring-[3px] focus-visible:ring-ring/40",
              applyRanteavdrag ? "bg-primary" : "bg-muted"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 rounded-full bg-card shadow-sm transition-transform duration-200 ease-out",
                applyRanteavdrag ? "translate-x-4" : "translate-x-0.5"
              )}
            />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
