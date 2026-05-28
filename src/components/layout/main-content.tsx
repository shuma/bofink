"use client";

import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewToggle } from "@/components/toolbar/view-toggle";
import { LoansListCard } from "@/components/cards/loans-list-card";
import { LoanDistributionCard } from "@/components/cards/loan-distribution-card";
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
  const hasData = loans.length > 0 || boVarde > 0 || inkomst > 0 || adress.length > 0;

  return (
    <>
      {/* Toolbar - sticky, only show when there's data */}
      {hasData && (
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 bg-background/95 px-6 backdrop-blur-sm">
          <ViewToggle />
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Information"
          >
            <Info className="h-4 w-4" />
          </Button>
        </header>
      )}

      {/* Content */}
      {hasData ? (
        <main className="space-y-6 p-6 pb-20">
          {/* Top row - Property overview and Monthly costs */}
          <div className="grid grid-cols-2 gap-6">
            <PropertyOverviewCard />
            <MonthlyCostsCard />
          </div>

          {/* Loans list */}
          <LoansListCard />

          {/* Loan distribution */}
          {loans.length > 0 && <LoanDistributionCard />}
        </main>
      ) : (
        <EmptyState />
      )}
    </>
  );
}
