"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useMortgageStore } from "@/hooks/use-mortgage-store";
import { formatSEK, formatPercent } from "@/lib/formatters";
import { banks } from "@/data/banks";

export function LoansListCard() {
  const { loans } = useMortgageStore();

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
        <CardTitle>Lån</CardTitle>
        <CardDescription>
          {loans.length} lån registrerade
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-1">
        {loans.map((loan) => {
          const bankInfo = banks.find(
            (b) => b.bank.toLowerCase() === loan.bank.toLowerCase()
          );

          return (
            <div
              key={loan.id}
              className="group flex items-center gap-3 rounded-xl px-2 py-2.5 -mx-2 transition-colors hover:bg-muted/40"
            >
              {/* Bank badge */}
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold tracking-tight"
                style={{
                  backgroundColor: bankInfo?.color || "oklch(0.5 0.02 260)",
                  color: "oklch(0.99 0 0)",
                }}
              >
                {bankInfo?.abbr || loan.bank.slice(0, 2).toUpperCase()}
              </div>

              {/* Loan info */}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium leading-tight">{loan.namn || loan.bank}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {loan.typ}, {formatPercent(loan.ranta)}
                </div>
              </div>

              {/* Amount */}
              <div className="text-sm font-medium tabular-nums text-right">
                {formatSEK(loan.belopp)}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
