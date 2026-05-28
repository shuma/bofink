export interface LoanOwner {
  namn: string;
  andel: number; // Ownership percentage 0-100
}

export interface NextPayment {
  amortering: number;
  ranta: number;
  total: number;
  datum: string;
}

export interface Loan {
  id: string;
  namn: string;           // Loan name
  belopp: number;         // Amount in SEK
  ranta: number;          // Interest rate %
  amortering: number;     // Yearly amortization amount
  bank: string;
  typ: string;            // "1 år", "3 år", "rörlig"
  rantaForfall: string;   // Rate expiry date
  agare: LoanOwner[];
  nextPayment?: NextPayment;
}

export interface MortgageCalculation {
  year: number;
  loanBalance: number;
  yearlyInterest: number;
  yearlyAmortization: number;
  yearlyCost: number;
  netCostAfterDeduction: number;
}
