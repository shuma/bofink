"use client";

import { useMortgageStore } from "@/hooks/use-mortgage-store";
import { formatSEK } from "@/lib/formatters";

export function NextPaymentCard() {
  const { loans } = useMortgageStore();

  const loansWithPayments = loans.filter((loan) => loan.nextPayment);

  return (
    <div>
      {/* Header */}
      <div className="mb-3.5">
        <span className="text-[13px] font-semibold">Nästa betalning</span>
      </div>

      {/* Payment details per loan */}
      <div className="space-y-0">
        {loansWithPayments.map((loan, i) => (
          <div
            key={loan.id}
            className={`py-1.5 ${i < loansWithPayments.length - 1 ? "border-b" : ""}`}
          >
            <div className="mb-0.5 text-[11px] text-muted-foreground">
              {loan.namn.slice(-9)} · {loan.nextPayment?.datum || "–"}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">Amortering</span>
              <span className="text-[13px] font-medium">
                {formatSEK(loan.nextPayment?.amortering || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">Ränta</span>
              <span className="text-[13px] font-medium text-red-600">
                {formatSEK(loan.nextPayment?.ranta || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold">Totalt</span>
              <span className="text-[13px] font-bold">
                {formatSEK(loan.nextPayment?.total || 0)}
              </span>
            </div>
          </div>
        ))}

        {loansWithPayments.length === 0 && (
          <div className="py-2 text-center text-[13px] text-muted-foreground">
            Ingen kommande betalning
          </div>
        )}
      </div>
    </div>
  );
}
