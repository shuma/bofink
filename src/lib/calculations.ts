import { Loan, MortgageCalculation } from "@/types/loan";

/**
 * Swedish tax deduction rate for mortgage interest
 * 30% of interest is tax deductible
 */
const TAX_DEDUCTION_RATE = 0.3;

/**
 * Calculate Swedish amortization requirement based on LTV and debt ratio
 * @param loanAmount Total loan amount
 * @param propertyValue Property value
 * @param yearlyIncome Yearly gross income
 * @returns Required yearly amortization percentage
 */
export function calculateAmortizationRequirement(
  loanAmount: number,
  propertyValue: number,
  yearlyIncome: number
): number {
  const ltv = (loanAmount / propertyValue) * 100; // Belåningsgrad
  const debtRatio = loanAmount / yearlyIncome; // Skuldkvot

  let amortizationRate = 0;

  // LTV based requirement
  if (ltv > 70) {
    amortizationRate = 2; // 2% per year if LTV > 70%
  } else if (ltv > 50) {
    amortizationRate = 1; // 1% per year if LTV 50-70%
  }

  // Additional requirement if debt ratio > 4.5x
  if (debtRatio > 4.5) {
    amortizationRate += 1; // Additional 1% per year
  }

  return amortizationRate;
}

/**
 * Calculate yearly amortization amount
 */
export function calculateYearlyAmortization(
  loanAmount: number,
  amortizationRate: number
): number {
  return loanAmount * (amortizationRate / 100);
}

/**
 * Calculate monthly payment (interest + amortization)
 */
export function calculateMonthlyPayment(
  loanAmount: number,
  interestRate: number,
  yearlyAmortization: number
): { interest: number; amortization: number; total: number } {
  const monthlyInterest = (loanAmount * (interestRate / 100)) / 12;
  const monthlyAmortization = yearlyAmortization / 12;

  return {
    interest: monthlyInterest,
    amortization: monthlyAmortization,
    total: monthlyInterest + monthlyAmortization,
  };
}

/**
 * Calculate net interest cost after Swedish tax deduction (ränteavdrag)
 */
export function calculateNetInterestCost(grossInterest: number): number {
  return grossInterest * (1 - TAX_DEDUCTION_RATE);
}

/**
 * Calculate tax deduction amount
 */
export function calculateTaxDeduction(grossInterest: number): number {
  return grossInterest * TAX_DEDUCTION_RATE;
}

/**
 * Calculate loan projections over time
 */
export function calculateLoanProjections(
  loans: Loan[],
  years: number,
  propertyValue: number,
  yearlyIncome: number
): MortgageCalculation[] {
  const projections: MortgageCalculation[] = [];

  let currentBalance = loans.reduce((sum, loan) => sum + loan.belopp, 0);
  const totalYearlyAmortization = loans.reduce(
    (sum, loan) => sum + loan.amortering,
    0
  );

  // Calculate weighted average interest rate
  const weightedRate =
    loans.reduce((sum, loan) => sum + loan.belopp * loan.ranta, 0) /
    (currentBalance || 1);

  for (let year = 0; year <= years; year++) {
    const yearlyInterest = currentBalance * (weightedRate / 100);
    const yearlyCost = yearlyInterest + totalYearlyAmortization;
    const netCost = calculateNetInterestCost(yearlyInterest) + totalYearlyAmortization;

    projections.push({
      year,
      loanBalance: Math.max(0, currentBalance),
      yearlyInterest,
      yearlyAmortization: totalYearlyAmortization,
      yearlyCost,
      netCostAfterDeduction: netCost,
    });

    currentBalance -= totalYearlyAmortization;
  }

  return projections;
}

/**
 * Calculate total loan amount from all loans
 */
export function calculateTotalLoan(loans: Loan[]): number {
  return loans.reduce((sum, loan) => sum + loan.belopp, 0);
}

/**
 * Calculate LTV (Loan-to-Value) ratio
 */
export function calculateLTV(loanAmount: number, propertyValue: number): number {
  if (propertyValue === 0) return 0;
  return (loanAmount / propertyValue) * 100;
}

/**
 * Calculate debt ratio (Skuldkvot)
 */
export function calculateDebtRatio(
  loanAmount: number,
  yearlyIncome: number
): number {
  if (yearlyIncome === 0) return 0;
  return loanAmount / yearlyIncome;
}

/**
 * Calculate weighted average interest rate
 */
export function calculateWeightedRate(loans: Loan[]): number {
  const totalAmount = calculateTotalLoan(loans);
  if (totalAmount === 0) return 0;

  return (
    loans.reduce((sum, loan) => sum + loan.belopp * loan.ranta, 0) / totalAmount
  );
}

/**
 * Calculate total yearly cost
 */
export function calculateYearlyCost(loans: Loan[]): {
  interest: number;
  netInterest: number;
  amortization: number;
  total: number;
  netTotal: number;
} {
  const interest = loans.reduce(
    (sum, loan) => sum + loan.belopp * (loan.ranta / 100),
    0
  );
  const netInterest = calculateNetInterestCost(interest);
  const amortization = loans.reduce((sum, loan) => sum + loan.amortering, 0);
  const total = interest + amortization;
  const netTotal = netInterest + amortization;

  return { interest, netInterest, amortization, total, netTotal };
}
