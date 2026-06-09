"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import { Loan } from "@/types/loan";

export type Years = 10 | 20 | 30;
export type ViewMode = "preview" | "data" | "code" | "layers";
export type NavItem = "dashboard" | "loans" | "analysis" | "settings";

interface MortgageState {
  // Core data
  loans: Loan[];
  years: Years;
  adress: string;
  boVarde: number; // Property value
  inkomst: number; // Monthly income
  fodelsear: number; // Birth year (0 = unknown), used for pension-age markers
  applyRanteavdrag: boolean; // Count interest deduction in monthly cost (vs. received via tax return)

  // UI state
  activeNav: NavItem;
  viewMode: ViewMode;
  chatOpen: boolean;

  // Actions - Loans
  addLoan: (loan: Omit<Loan, "id">) => void;
  updateLoan: (id: string, updates: Partial<Loan>) => void;
  removeLoan: (id: string) => void;

  // Actions - Settings
  setYears: (years: Years) => void;
  setAdress: (adress: string) => void;
  setBoVarde: (value: number) => void;
  setInkomst: (value: number) => void;
  setFodelsear: (value: number) => void;
  setApplyRanteavdrag: (value: boolean) => void;

  // Actions - UI
  setActiveNav: (nav: NavItem) => void;
  setViewMode: (mode: ViewMode) => void;
  setChatOpen: (open: boolean) => void;

  // Bulk set from agent answers
  setFromAgentAnswers: (answers: Record<string, string | number>) => void;

  // Reset all data
  resetAll: () => void;
}

const initialState = {
  loans: [],
  years: 30 as Years,
  adress: "",
  boVarde: 0,
  inkomst: 0,
  fodelsear: 0,
  applyRanteavdrag: false,
  activeNav: "dashboard" as NavItem,
  viewMode: "preview" as ViewMode,
  chatOpen: true,
};

export const useMortgageStore = create<MortgageState>()(
  persist(
    (set) => ({
      ...initialState,

      // Loan actions
      addLoan: (loan) =>
        set((state) => ({
          loans: [...state.loans, { ...loan, id: nanoid() }],
        })),

      updateLoan: (id, updates) =>
        set((state) => ({
          loans: state.loans.map((loan) =>
            loan.id === id ? { ...loan, ...updates } : loan
          ),
        })),

      removeLoan: (id) =>
        set((state) => ({
          loans: state.loans.filter((loan) => loan.id !== id),
        })),

      // Settings actions
      setYears: (years) => set({ years }),
      setAdress: (adress) => set({ adress }),
      setBoVarde: (boVarde) => set({ boVarde }),
      setInkomst: (inkomst) => set({ inkomst }),
      setFodelsear: (fodelsear) => set({ fodelsear }),
      setApplyRanteavdrag: (applyRanteavdrag) => set({ applyRanteavdrag }),

      // UI actions
      setActiveNav: (activeNav) => set({ activeNav }),
      setViewMode: (viewMode) => set({ viewMode }),
      setChatOpen: (chatOpen) => set({ chatOpen }),

      // Bulk set from agent answers
      setFromAgentAnswers: (answers) => {
        set((state) => {
          const updates: Partial<MortgageState> = {};

          // Map answer keys to store properties
          if (typeof answers.boVarde === "number" && answers.boVarde > 0) {
            updates.boVarde = answers.boVarde;
          }
          if (typeof answers.inkomst === "number" && answers.inkomst > 0) {
            updates.inkomst = answers.inkomst;
          }
          if (typeof answers.adress === "string" && answers.adress.length > 0) {
            updates.adress = answers.adress;
          }
          if (typeof answers.fodelsear === "number" && answers.fodelsear > 1900) {
            updates.fodelsear = answers.fodelsear;
          }
          if (
            typeof answers.years === "number" &&
            [10, 20, 30].includes(answers.years)
          ) {
            updates.years = answers.years as Years;
          }

          // Handle loan creation if we have loan data
          const loanAmount = answers.loanAmount;
          const interestRate = answers.interestRate;
          const bank = answers.bank;
          const loanType = answers.loanType;
          const loanName = answers.loanName;

          if (typeof loanAmount === "number" && loanAmount > 0) {
            const newLoan: Omit<Loan, "id"> = {
              namn: typeof loanName === "string" ? loanName : "Bolån",
              belopp: loanAmount,
              ranta: typeof interestRate === "number" ? interestRate : 3.5,
              amortering: 0, // Will be calculated based on rules
              bank: typeof bank === "string" ? bank : "Okänd bank",
              typ: typeof loanType === "string" ? loanType : "rörlig",
              rantaForfall: "",
              agare: [],
            };

            // Calculate required amortization if we have enough data
            const propertyValue = updates.boVarde ?? state.boVarde;
            const monthlyIncome = updates.inkomst ?? state.inkomst;
            if (propertyValue > 0 && monthlyIncome > 0) {
              const ltv = (loanAmount / propertyValue) * 100;
              const yearlyIncome = monthlyIncome * 12;
              const debtRatio = loanAmount / yearlyIncome;

              let requiredRate = 0;
              if (ltv > 70) requiredRate = 2;
              else if (ltv > 50) requiredRate = 1;
              if (debtRatio > 4.5) requiredRate += 1;

              newLoan.amortering = loanAmount * (requiredRate / 100);
            }

            // Add loan to the array
            return {
              ...state,
              ...updates,
              loans: [...state.loans, { ...newLoan, id: nanoid() }],
            };
          }

          return { ...state, ...updates };
        });
      },

      // Reset all data
      resetAll: () => set(initialState),
    }),
    {
      name: "bolaneplaner-mortgage-storage",
      // Only persist core data, not UI state
      partialize: (state) => ({
        loans: state.loans,
        years: state.years,
        adress: state.adress,
        boVarde: state.boVarde,
        inkomst: state.inkomst,
        fodelsear: state.fodelsear,
        applyRanteavdrag: state.applyRanteavdrag,
      }),
    }
  )
);
