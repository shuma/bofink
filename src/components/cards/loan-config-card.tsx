"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { useMortgageStore } from "@/hooks/use-mortgage-store";
import { Loan } from "@/types/loan";
import { formatSEK, formatPercent } from "@/lib/formatters";
import { banks, getBankColor } from "@/data/banks";
import { cn } from "@/lib/utils";

export function LoanConfigCard() {
  const { loans } = useMortgageStore();

  return (
    <div className="overflow-hidden rounded-xl border">
      {/* Header */}
      <div className="border-b px-4 py-3">
        <span className="text-[13px] font-semibold">Lånekonfiguration</span>
      </div>

      {/* Loans */}
      {loans.map((loan, i) => (
        <LoanConfigItem key={loan.id} loan={loan} isLast={i === loans.length - 1} />
      ))}
    </div>
  );
}

function LoanConfigItem({ loan, isLast }: { loan: Loan; isLast: boolean }) {
  const [showCompare, setShowCompare] = useState(false);
  const bankInfo = banks.find((b) => b.bank.toLowerCase() === loan.bank.toLowerCase());
  const cheaper = banks.filter((b) => b.rate < loan.ranta);

  return (
    <div className={cn("p-4", !isLast && "border-b")}>
      {/* Loan header */}
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {bankInfo && (
            <div
              className="flex h-[26px] w-[26px] items-center justify-center rounded-md text-[9px] font-bold text-white"
              style={{ background: bankInfo.color }}
            >
              {bankInfo.abbr}
            </div>
          )}
          <span className="text-[13px] font-semibold">{loan.namn}</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {loan.typ}
          </span>
          <span className="text-[11px] text-muted-foreground">
            Förfall {loan.rantaForfall}
          </span>
        </div>
        <div className="flex gap-2">
          {loan.agare?.map((ag, i) => (
            <span
              key={i}
              className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              {ag.namn} {ag.andel}%
            </span>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-muted/50 px-3 py-2.5">
          <div className="text-[11px] text-muted-foreground">Lånebelopp</div>
          <div className="text-sm font-semibold">{formatSEK(loan.belopp)}</div>
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2.5">
          <div className="text-[11px] text-muted-foreground">Ränta</div>
          <div className="text-sm font-semibold">{formatPercent(loan.ranta)}</div>
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2.5">
          <div className="text-[11px] text-muted-foreground">Amortering / år</div>
          <div className="text-sm font-semibold">{formatSEK(loan.amortering)}</div>
        </div>
      </div>

      {/* Rate comparison */}
      <RateCompare rate={loan.ranta} showCompare={showCompare} setShowCompare={setShowCompare} cheaper={cheaper} />
    </div>
  );
}

function RateCompare({
  rate,
  showCompare,
  setShowCompare,
  cheaper,
}: {
  rate: number;
  showCompare: boolean;
  setShowCompare: (v: boolean) => void;
  cheaper: typeof banks;
}) {
  const allRates = [...banks.map((b) => b.rate), rate];
  const minR = Math.min(...allRates) - 0.1;
  const maxR = Math.max(...allRates) + 0.1;
  const range = maxR - minR;
  const barWidth = (r: number) => `${Math.max(3, ((r - minR) / range) * 100)}%`;

  return (
    <div className="border-t pt-3">
      <button
        className="flex w-full items-center gap-2 text-left"
        onClick={() => setShowCompare(!showCompare)}
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            showCompare && "rotate-90"
          )}
        />
        <span className="text-[13px] font-medium text-muted-foreground">
          Jämför med storbanker
        </span>
        {cheaper.length > 0 ? (
          <span className="ml-auto text-[12px] font-medium text-red-600">
            {cheaper.length} billigare
          </span>
        ) : (
          <span className="ml-auto text-[12px] font-medium text-green-600">
            Bäst ränta
          </span>
        )}
      </button>

      {showCompare && (
        <div className="mt-3 space-y-1.5">
          {/* Your rate */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-foreground">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
                <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="2"/>
              </svg>
            </div>
            <span className="w-28 flex-shrink-0 text-[13px] font-semibold">Din ränta</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: barWidth(rate) }} />
            </div>
            <span className="w-12 text-right text-[13px] font-bold text-primary">
              {formatPercent(rate)}
            </span>
          </div>

          {/* Bank rates */}
          {banks.map((bank) => {
            const diff = bank.rate - rate;
            const isLower = diff < -0.01;
            return (
              <div key={bank.bank} className="flex items-center gap-2.5">
                <div
                  className="flex h-[26px] w-[26px] items-center justify-center rounded-md text-[9px] font-bold text-white"
                  style={{ background: bank.color }}
                >
                  {bank.abbr}
                </div>
                <span className="w-28 flex-shrink-0 truncate text-[13px] text-muted-foreground">
                  {bank.bank}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", isLower ? "bg-red-300" : "bg-muted-foreground/30")}
                    style={{ width: barWidth(bank.rate) }}
                  />
                </div>
                <span className="w-12 text-right text-[13px] text-muted-foreground">
                  {formatPercent(bank.rate)}
                </span>
                <span
                  className={cn(
                    "w-14 text-right text-[12px] font-semibold",
                    isLower ? "text-red-600" : "text-green-600"
                  )}
                >
                  {diff > 0 ? "+" : ""}{diff.toFixed(2).replace(".", ",")}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
