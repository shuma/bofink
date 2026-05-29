"use client";

import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useMortgageStore } from "@/hooks/use-mortgage-store";
import { formatSEK, formatPercent } from "@/lib/formatters";
import { banks } from "@/data/banks";

// OKLCH chart colors from DESIGN.md
const COLORS = [
  "oklch(0.72 0.14 250)",
  "oklch(0.62 0.17 250)",
  "oklch(0.52 0.18 250)",
  "oklch(0.82 0.1 250)",
  "oklch(0.45 0.18 250)",
];

export function LoansOverviewCard() {
  const { loans } = useMortgageStore();

  const totalLoan = useMemo(
    () => loans.reduce((sum, loan) => sum + loan.belopp, 0),
    [loans]
  );

  const loansWithShare = useMemo(() => {
    return loans.map((loan, index) => ({
      ...loan,
      share: totalLoan > 0 ? (loan.belopp / totalLoan) * 100 : 0,
      color: COLORS[index % COLORS.length],
    }));
  }, [loans, totalLoan]);

  if (loans.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lån</CardTitle>
          <CardDescription>Inga lån registrerade ännu</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Berätta om dina lån i chatten så lägger jag till dem här.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Lån</CardTitle>
            <CardDescription>{loans.length} lån</CardDescription>
          </div>
          <div className="text-right">
            <div className="font-heading text-lg font-semibold tabular-nums tracking-tight">
              {formatSEK(totalLoan)}
            </div>
            <div className="text-xs text-muted-foreground">totalt</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Loans list */}
        <div className="space-y-0.5">
          {loansWithShare.map((loan) => {
            const bankInfo = banks.find(
              (b) => b.bank.toLowerCase() === loan.bank.toLowerCase()
            );

            return (
              <div
                key={loan.id}
                className="group flex items-center gap-3 rounded-xl px-2 py-2.5 -mx-2 transition-colors hover:bg-muted/40"
              >
                {/* Color bar + Bank badge */}
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <div
                    className="w-1 h-8 rounded-full"
                    style={{ backgroundColor: loan.color }}
                  />
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-semibold tracking-tight"
                    style={{
                      backgroundColor: bankInfo?.color || "oklch(0.5 0.02 260)",
                      color: "oklch(0.99 0 0)",
                    }}
                  >
                    {bankInfo?.abbr || loan.bank.slice(0, 2).toUpperCase()}
                  </div>
                </div>

                {/* Loan info */}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium leading-tight">
                    {loan.namn || loan.bank}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {loan.typ}, {formatPercent(loan.ranta)}
                  </div>
                </div>

                {/* Amount + share */}
                <div className="text-right">
                  <div className="text-sm font-medium tabular-nums">
                    {formatSEK(loan.belopp)}
                  </div>
                  <div className="text-xs tabular-nums text-muted-foreground">
                    {loan.share.toFixed(0)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
