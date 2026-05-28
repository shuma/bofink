"use client";

import { useMemo } from "react";
import { Pie, PieChart, Cell, Label, Tooltip } from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useMortgageStore } from "@/hooks/use-mortgage-store";
import { formatSEK } from "@/lib/formatters";

// OKLCH chart colors from DESIGN.md (blue gradient + complementary)
const COLORS = [
  "oklch(0.62 0.17 250)", // chart-3 (primary blue)
  "oklch(0.72 0.14 250)", // chart-2
  "oklch(0.52 0.18 250)", // chart-4
  "oklch(0.82 0.1 250)",  // chart-1
  "oklch(0.45 0.18 250)", // chart-5
  "oklch(0.6 0.15 145)",  // green accent
  "oklch(0.7 0.15 85)",   // amber accent
  "oklch(0.55 0.12 300)", // purple accent
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
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Lånefördelning</CardTitle>
            <CardDescription>
              {loans.length} {loans.length === 1 ? "lån" : "lån"} totalt
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="font-heading text-xl font-semibold tabular-nums">
              {formatSEK(totalLoan)}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-8">
          {/* Pie chart */}
          <div className="relative h-[160px] w-[160px] flex-shrink-0">
            <PieChart width={160} height={160}>
              <Pie
                data={chartData}
                cx={80}
                cy={80}
                innerRadius={45}
                outerRadius={70}
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
                            y={(viewBox.cy || 0) - 6}
                            className="fill-foreground text-sm font-semibold"
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
                      <div className="rounded-xl border border-border/50 bg-card px-3 py-2 shadow-lg">
                        <p className="text-sm font-medium">{data.name}</p>
                        <p className="text-sm tabular-nums text-muted-foreground">
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
          <div className="flex-1 space-y-2.5">
            {chartData.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div
                  className="h-3 w-3 flex-shrink-0 rounded-sm"
                  style={{ backgroundColor: item.fill }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm">{item.name}</span>
                    <span className="flex-shrink-0 text-sm tabular-nums text-muted-foreground">
                      {item.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
