"use client";

import { useMemo } from "react";
import { Pie, PieChart, Cell, Label, Tooltip } from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useMortgageStore } from "@/hooks/use-mortgage-store";
import { formatSEK } from "@/lib/formatters";

// OKLCH chart colors from DESIGN.md (blue gradient)
const COLORS = [
  "oklch(0.72 0.14 250)", // chart-2 (lighter, for visual balance)
  "oklch(0.62 0.17 250)", // chart-3 (primary blue)
  "oklch(0.52 0.18 250)", // chart-4
  "oklch(0.82 0.1 250)",  // chart-1
  "oklch(0.45 0.18 250)", // chart-5
];

export function LoanDistributionCard() {
  const { loans } = useMortgageStore();

  const totalLoan = useMemo(
    () => loans.reduce((sum, loan) => sum + loan.belopp, 0),
    [loans]
  );

  const chartData = useMemo(() => {
    return loans.map((loan, index) => ({
      id: loan.id,
      name: loan.namn || loan.bank,
      value: loan.belopp,
      percentage: totalLoan > 0 ? (loan.belopp / totalLoan) * 100 : 0,
      fill: COLORS[index % COLORS.length],
    }));
  }, [loans, totalLoan]);

  if (loans.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Lånefördelning</CardTitle>
            <CardDescription>
              {loans.length} lån totalt
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="font-heading text-lg font-semibold tabular-nums tracking-tight">
              {formatSEK(totalLoan)}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-6">
          {/* Pie chart */}
          <div className="relative h-[120px] w-[120px] flex-shrink-0">
            <PieChart width={120} height={120}>
              <Pie
                data={chartData}
                cx={60}
                cy={60}
                innerRadius={36}
                outerRadius={54}
                dataKey="value"
                nameKey="name"
                strokeWidth={2}
                stroke="oklch(0.995 0.002 85)"
                paddingAngle={2}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.id} fill={entry.fill} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) - 4}
                            className="fill-foreground text-base font-semibold"
                          >
                            {loans.length}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 10}
                            className="fill-muted-foreground text-[10px]"
                          >
                            lån
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border border-border/50 bg-card px-2.5 py-1.5 shadow-md">
                        <p className="text-xs font-medium">{data.name}</p>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          {formatSEK(data.value)} ({data.percentage.toFixed(0)}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2">
            {chartData.map((item) => (
              <div key={item.id} className="flex items-center gap-2.5">
                <div
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: item.fill }}
                />
                <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
                <span className="flex-shrink-0 text-sm tabular-nums text-muted-foreground">
                  {item.percentage.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
