"use client";

import { useId, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useMortgageStore } from "@/hooks/use-mortgage-store";
import { useCalculations } from "@/hooks/use-calculations";
import { formatSEK } from "@/lib/formatters";

// Calm Blue primary, from DESIGN.md
const STROKE = "oklch(0.6 0.18 250)";

const currentYear = new Date().getFullYear();

/** Compact SEK for axis ticks: 2,4 mkr / 850 tkr */
function formatCompactSEK(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${millions.toLocaleString("sv-SE", { maximumFractionDigits: 1 })} mkr`;
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000).toLocaleString("sv-SE")} tkr`;
  }
  return formatSEK(value);
}

/** Generate clean, evenly spaced axis ticks from 0 up to a nice ceiling >= max. */
function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const rawStep = max / count;
  const pow = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const n = rawStep / pow;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(v);
  return ticks;
}

/** Fractional year where the balance curve crosses a target value (or null). */
function crossingYear(
  data: { year: number; balance: number }[],
  target: number
): number | null {
  for (let i = 1; i < data.length; i++) {
    const a = data[i - 1];
    const b = data[i];
    if (a.balance >= target && b.balance <= target && a.balance !== b.balance) {
      const t = (a.balance - target) / (a.balance - b.balance);
      return a.year + t * (b.year - a.year);
    }
  }
  return null;
}

export function DebtOverTimeCard() {
  const { loans, years, boVarde } = useMortgageStore();
  const { projections } = useCalculations();

  const data = useMemo(
    () =>
      projections.map((p) => ({
        year: p.year,
        calendarYear: currentYear + p.year,
        balance: Math.round(p.loanBalance),
      })),
    [projections]
  );

  const startBalance = data[0]?.balance ?? 0;
  const endBalance = data[data.length - 1]?.balance ?? 0;
  const reduction = startBalance - endBalance;
  const paidOff = startBalance > 0 ? (reduction / startBalance) * 100 : 0;

  // Clean Y ticks with headroom so the line never hugs the top edge.
  const yTicks = useMemo(() => niceTicks(startBalance, 4), [startBalance]);
  const yMax = yTicks[yTicks.length - 1] ?? 0;

  // Year axis ticks every 5 years, always including the final year.
  const xTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let y = 0; y <= years; y += 5) ticks.push(y);
    if (ticks[ticks.length - 1] !== years) ticks.push(years);
    return ticks;
  }, [years]);

  // LTV milestones: years where debt drops below 70% / 50% of property value.
  const milestones = useMemo(() => {
    if (boVarde <= 0) return [];
    return [
      { ratio: 0.7, label: "70%" },
      { ratio: 0.5, label: "50%" },
    ]
      .map((m) => ({ ...m, year: crossingYear(data, m.ratio * boVarde) }))
      .filter(
        (m): m is { ratio: number; label: string; year: number } =>
          m.year !== null && m.year > 0.25 && m.year < years - 0.25
      );
  }, [data, boVarde, years]);

  const gradientId = useId();

  if (loans.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Skuldutveckling</CardTitle>
            <CardDescription>Prognos över {years} år</CardDescription>
          </div>
          <div className="text-right">
            <div className="font-heading text-lg font-semibold tabular-nums tracking-tight">
              {formatSEK(endBalance)}
            </div>
            <div className="text-xs text-muted-foreground">om {years} år</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-[168px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 18, right: 8, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={STROKE} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={STROKE} stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                vertical={false}
                stroke="var(--border)"
                strokeOpacity={0.6}
                strokeDasharray="2 4"
              />

              <XAxis
                dataKey="year"
                type="number"
                domain={[0, years]}
                ticks={xTicks}
                tickFormatter={(y: number) => (y === 0 ? "Nu" : `${currentYear + y}`)}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickMargin={10}
                minTickGap={16}
              />

              <YAxis
                domain={[0, yMax]}
                ticks={yTicks}
                tickFormatter={(v: number) => formatCompactSEK(v)}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                width={60}
              />

              {milestones.map((m) => (
                <ReferenceLine
                  key={m.ratio}
                  x={m.year}
                  stroke="var(--muted-foreground)"
                  strokeOpacity={0.45}
                  strokeDasharray="3 4"
                  label={{
                    value: `${m.label} belåning`,
                    position: "top",
                    fill: "var(--muted-foreground)",
                    fontSize: 10,
                  }}
                />
              ))}

              <Tooltip
                cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload as {
                      year: number;
                      calendarYear: number;
                      balance: number;
                    };
                    return (
                      <div className="rounded-lg border border-border/50 bg-card px-2.5 py-1.5 shadow-md">
                        <p className="text-xs font-medium">
                          {d.year === 0 ? "Idag" : `År ${d.calendarYear}`}
                        </p>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          {formatSEK(d.balance)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Area
                type="monotone"
                dataKey="balance"
                stroke={STROKE}
                strokeWidth={2.5}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: STROKE,
                  stroke: "var(--card)",
                  strokeWidth: 2,
                }}
                animationDuration={600}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quiet footer: start to end, reads without hovering */}
        <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Idag</div>
            <div className="font-medium tabular-nums">{formatSEK(startBalance)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Amorterat</div>
            <div className="font-medium tabular-nums text-primary">
              {paidOff.toFixed(0)}%
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Om {years} år</div>
            <div className="font-medium tabular-nums">{formatSEK(endBalance)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
