"use client";

import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewToggle } from "@/components/toolbar/view-toggle";
import { LoansOverviewCard } from "@/components/cards/loans-overview-card";
import { DebtOverTimeCard } from "@/components/cards/debt-over-time-card";
import { MonthlyCostsCard } from "@/components/cards/monthly-costs-card";
import { PropertyOverviewCard } from "@/components/cards/property-overview-card";
import { useMortgageStore } from "@/hooks/use-mortgage-store";

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="flex max-w-sm flex-col items-center text-center">
        <p className="text-sm text-muted-foreground/70">
          Berätta om dina bolån i chatten så skapar vi din översikt.
        </p>
      </div>
    </div>
  );
}

export function MainContent() {
  const { loans, boVarde, inkomst, adress } = useMortgageStore();

  // Check if we have any meaningful data
  const hasData =
    loans.length > 0 || boVarde > 0 || inkomst > 0 || adress.length > 0;

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Toolbar - only show when there's data */}
      {hasData && (
        <header className="flex h-12 flex-shrink-0 items-center gap-3 bg-sidebar px-4">
          <ViewToggle />
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground/60 hover:text-foreground"
            aria-label="Information"
          >
            <Info className="h-4 w-4" />
          </Button>
        </header>
      )}

      {/* Content */}
      {hasData ? (
        <div className="mx-3 mb-3 min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/50 bg-background">
          <main className="h-full space-y-5 overflow-y-auto p-5">
            {/* Top row - Property overview and Monthly costs */}
            <div className="grid grid-cols-2 gap-5">
              <PropertyOverviewCard />
              <MonthlyCostsCard />
            </div>

            {/* Loans overview */}
            <LoansOverviewCard />

            {/* Debt trajectory over time */}
            <DebtOverTimeCard />
          </main>
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
