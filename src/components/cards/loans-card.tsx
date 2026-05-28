"use client";

import { Plus } from "lucide-react";
import { useMortgageStore } from "@/hooks/use-mortgage-store";
import { formatSEK, formatPercent } from "@/lib/formatters";

export function LoansCard() {
  const { loans, addLoan } = useMortgageStore();

  const handleAddLoan = () => {
    addLoan({
      namn: "Nytt lån",
      belopp: 0,
      ranta: 3.5,
      amortering: 0,
      bank: "SBAB",
      typ: "rörlig",
      rantaForfall: new Date().toISOString().split("T")[0],
      agare: [{ namn: "Person 1", andel: 100 }],
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-3.5 flex items-center justify-between">
        <span className="text-[13px] font-semibold">Lån</span>
        <button
          onClick={handleAddLoan}
          className="flex h-5 w-5 items-center justify-center rounded border bg-background"
        >
          <Plus className="h-2.5 w-2.5 text-muted-foreground" />
        </button>
      </div>

      {/* Loans list */}
      <div className="space-y-0">
        {loans.map((loan, i) => (
          <div
            key={loan.id}
            className={`py-1.5 ${i < loans.length - 1 ? "border-b" : ""}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[13px] font-medium">{loan.bank || "–"}</div>
                <div className="text-[11px] text-muted-foreground">
                  {loan.typ} · förfall {loan.rantaForfall || "–"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[13px] font-medium">{formatSEK(loan.belopp)}</div>
                <div className="text-[11px] text-muted-foreground">
                  {formatPercent(loan.ranta)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
