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
          {loans.length} {loans.length === 1 ? "lån" : "lån"} registrerade
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {loans.map((loan) => {
          const bankInfo = banks.find(
            (b) => b.bank.toLowerCase() === loan.bank.toLowerCase()
          );

          return (
            <div
              key={loan.id}
              className="group flex items-center gap-3 rounded-xl p-2 -mx-2 transition-colors hover:bg-muted/50"
            >
              {/* Bank icon */}
              <div
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold shadow-sm transition-transform group-hover:scale-105"
                style={{
                  backgroundColor: bankInfo?.color || "oklch(0.5 0.02 260)",
                  color: "oklch(0.99 0 0)",
                }}
              >
                {bankInfo?.abbr || loan.bank.slice(0, 2).toUpperCase()}
              </div>

              {/* Loan info */}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{loan.namn || loan.bank}</div>
                <div className="text-xs text-muted-foreground">
                  {loan.typ} · {formatPercent(loan.ranta)}
                </div>
              </div>

              {/* Amount */}
              <div className="text-right">
                <div className="text-sm font-medium tabular-nums">{formatSEK(loan.belopp)}</div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
