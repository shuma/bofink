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

  // Actions - UI
  setActiveNav: (nav: NavItem) => void;
  setViewMode: (mode: ViewMode) => void;
  setChatOpen: (open: boolean) => void;

  // Reset all data
  resetAll: () => void;
}

const initialState = {
  loans: [],
  years: 30 as Years,
  adress: "",
  boVarde: 0,
  inkomst: 0,
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

      // UI actions
      setActiveNav: (activeNav) => set({ activeNav }),
      setViewMode: (viewMode) => set({ viewMode }),
      setChatOpen: (chatOpen) => set({ chatOpen }),

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
      }),
    }
  )
);
