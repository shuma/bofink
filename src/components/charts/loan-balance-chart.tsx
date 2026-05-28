"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useCalculations } from "@/hooks/use-calculations";
import { useMortgageStore } from "@/hooks/use-mortgage-store";
import { formatSEK } from "@/lib/formatters";
import { YearSelector } from "@/components/toolbar/year-selector";
import { ViewToggle } from "@/components/toolbar/view-toggle";

const chartConfig = {
  loanBalance: {
    label: "Låneskuld",
    color: "var(--chart-1)",
  },
  netCost: {
    label: "Nettokostnad",
    color: "var(--chart-2)",
  },
};

export function LoanBalanceChart() {
  const { viewMode } = useMortgageStore();
  const { projections } = useCalculations();

  const chartData = projections.map((p) => ({
    year: `År ${p.year}`,
    yearNum: p.year,
    loanBalance: p.loanBalance,
    netCost: p.netCostAfterDeduction,
  }));

  if (viewMode === "data") {
    return (
      <Card>
        <div className="flex items-center justify-between px-6 pt-6">
          <h3 className="font-medium">Låneprognos</h3>
          <div className="flex items-center gap-3">
            <YearSelector />
            <ViewToggle />
          </div>
        </div>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4">År</th>
                  <th className="pb-2 pr-4 text-right">Låneskuld</th>
                  <th className="pb-2 pr-4 text-right">Ränta</th>
                  <th className="pb-2 pr-4 text-right">Amortering</th>
                  <th className="pb-2 text-right">Nettokostnad</th>
                </tr>
              </thead>
              <tbody>
                {projections.map((p) => (
                  <tr key={p.year} className="border-b last:border-0">
                    <td className="py-2 pr-4">{p.year}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {formatSEK(p.loanBalance)}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {formatSEK(p.yearlyInterest)}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {formatSEK(p.yearlyAmortization)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatSEK(p.netCostAfterDeduction)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between px-6 pt-6">
        <h3 className="font-medium">Låneprognos</h3>
        <div className="flex items-center gap-3">
          <YearSelector />
          <ViewToggle />
        </div>
      </div>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="fillBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--chart-1)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--chart-1)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="year"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
                tickFormatter={(value) =>
                  `${(value / 1000000).toFixed(1)} mkr`
                }
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => {
                      return [formatSEK(Number(value)), name];
                    }}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="loanBalance"
                stroke="var(--chart-1)"
                fill="url(#fillBalance)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
