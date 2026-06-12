import type { InsurelyLoanRaw, BindingPeriod } from "@/types/insurely";
import type { Loan } from "@/types/loan";

/**
 * Convert binding period to Swedish format
 */
export function formatBindingPeriod(period: BindingPeriod | string): string {
  const map: Record<string, string> = {
    ONE_YEAR: "1 år",
    TWO_YEARS: "2 år",
    THREE_YEARS: "3 år",
    FIVE_YEARS: "5 år",
    VARIABLE: "rörlig",
  };
  return map[period] || "rörlig";
}

/**
 * Transform a raw Insurely loan to our Loan type
 */
export function transformInsurelyLoan(rawLoan: InsurelyLoanRaw): Omit<Loan, "id"> {
  return {
    namn: `${rawLoan.companyDisplayName} - ${rawLoan.loanId}`,
    belopp: rawLoan.loanDetails.balance.amount,
    ranta: rawLoan.interest.rate * 100, // Convert from decimal to percentage
    amortering: rawLoan.nextPayment.instalment.amount * 12, // Yearly amortization
    bank: rawLoan.companyDisplayName,
    typ: formatBindingPeriod(rawLoan.interestBindingPeriod),
    rantaForfall: rawLoan.interest.rateAdjustmentDate,
    agare: rawLoan.owners.map((owner) => ({
      namn: owner.name,
      andel: owner.sharePercentage * 100, // Convert from decimal to percentage
    })),
    nextPayment: {
      amortering: rawLoan.nextPayment.instalment.amount,
      ranta: rawLoan.nextPayment.interest.amount,
      total: rawLoan.nextPayment.total.amount,
      datum: rawLoan.nextPayment.date,
    },
  };
}

/**
 * Transform an array of raw Insurely loans
 */
export function transformInsurelyLoans(rawLoans: InsurelyLoanRaw[]): Omit<Loan, "id">[] {
  return rawLoans.map(transformInsurelyLoan);
}

/**
 * Extract property address from loan data if available
 */
export function extractPropertyInfo(rawLoans: InsurelyLoanRaw[]): {
  address?: string;
  estimatedValue?: number;
} {
  // Try to find property info from the first mortgage loan
  const mortgageLoan = rawLoans.find((loan) => loan.type === "MORTGAGE_LOAN");

  if (mortgageLoan?.financedObject) {
    return {
      address: mortgageLoan.financedObject,
    };
  }

  return {};
}
