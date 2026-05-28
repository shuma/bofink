"use client";

import { useMemo } from "react";
import { useMortgageStore } from "./use-mortgage-store";
import {
  calculateTotalLoan,
  calculateLTV,
  calculateDebtRatio,
  calculateWeightedRate,
  calculateYearlyCost,
  calculateLoanProjections,
  calculateAmortizationRequirement,
} from "@/lib/calculations";

export function useCalculations() {
  const { loans, years, boVarde, inkomst } = useMortgageStore();

  return useMemo(() => {
    const totalLoan = calculateTotalLoan(loans);
    const yearlyIncome = inkomst * 12;

    const ltv = calculateLTV(totalLoan, boVarde);
    const debtRatio = calculateDebtRatio(totalLoan, yearlyIncome);
    const weightedRate = calculateWeightedRate(loans);
    const yearlyCost = calculateYearlyCost(loans);
    const projections = calculateLoanProjections(
      loans,
      years,
      boVarde,
      yearlyIncome
    );
    const requiredAmortization = calculateAmortizationRequirement(
      totalLoan,
      boVarde,
      yearlyIncome
    );

    // Monthly values
    const monthlyInterestGross = yearlyCost.interest / 12;
    const monthlyInterestNet = yearlyCost.netInterest / 12;
    const monthlyInterest = monthlyInterestNet;
    const monthlyAmortization = yearlyCost.amortization / 12;
    const monthlyTotal = yearlyCost.total / 12;
    const monthlyNetTotal = yearlyCost.netTotal / 12;

    return {
      totalLoan,
      totalDebt: totalLoan,
      ltv,
      debtRatio,
      weightedRate,
      yearlyCost,
      projections,
      requiredAmortization,
      monthlyInterest,
      monthlyInterestGross,
      monthlyInterestNet,
      monthlyAmortization,
      monthlyTotal,
      monthlyNetTotal,
    };
  }, [loans, years, boVarde, inkomst]);
}
