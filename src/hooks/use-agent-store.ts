"use client";

import { create } from "zustand";

export type Category = "bolan" | "forsakringar";
export type OnboardingMode = "insurely" | "manual";

interface CollectedAnswer {
  field: string;
  value: string | number;
  question: string;
  timestamp: number;
}

// Pre-made questions for Bolån category
export const BOLAN_QUESTIONS = [
  {
    field: "address",
    question: "Vad är bostadens adress?",
    inputType: "text" as const,
    placeholder: "T.ex. Storgatan 1, Stockholm",
  },
  {
    field: "propertyValue",
    question: "Vad är bostadens uppskattade värde?",
    inputType: "number" as const,
    placeholder: "T.ex. 3 500 000",
    unit: "kr",
  },
  {
    field: "loanAmount",
    question: "Hur stor är din totala låneskuld?",
    inputType: "number" as const,
    placeholder: "T.ex. 2 800 000",
    unit: "kr",
  },
  {
    field: "interestRate",
    question: "Vad är din nuvarande ränta?",
    inputType: "number" as const,
    placeholder: "T.ex. 3.5",
    unit: "%",
  },
  {
    field: "monthlyIncome",
    question: "Vad är din månadsinkomst före skatt?",
    inputType: "number" as const,
    placeholder: "T.ex. 45 000",
    unit: "kr",
  },
  {
    field: "birthYear",
    question: "Vilket år är du född?",
    inputType: "number" as const,
    placeholder: "T.ex. 1985",
  },
];

interface AgentState {
  // Category selection
  selectedCategory: Category | null;
  setSelectedCategory: (category: Category | null) => void;

  // Onboarding mode
  mode: OnboardingMode;
  setMode: (mode: OnboardingMode) => void;

  // Collected answers
  collectedAnswers: CollectedAnswer[];
  addAnswer: (answer: Omit<CollectedAnswer, "timestamp">) => void;
  getAnswerByField: (field: string) => CollectedAnswer | undefined;

  // Question navigation for manual flow
  currentQuestionIndex: number;
  setCurrentQuestionIndex: (index: number) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;

  // Reset
  reset: () => void;
}

const initialState = {
  selectedCategory: null as Category | null,
  mode: "insurely" as OnboardingMode,
  collectedAnswers: [] as CollectedAnswer[],
  currentQuestionIndex: 0,
};

export const useAgentStore = create<AgentState>((set, get) => ({
  ...initialState,

  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),

  setMode: (mode) => set({ mode }),

  addAnswer: (answer) =>
    set((state) => ({
      collectedAnswers: [
        ...state.collectedAnswers.filter((a) => a.field !== answer.field),
        { ...answer, timestamp: Date.now() },
      ],
    })),

  getAnswerByField: (field) => {
    const state = get();
    return state.collectedAnswers.find((a) => a.field === field);
  },

  setCurrentQuestionIndex: (currentQuestionIndex) =>
    set({ currentQuestionIndex }),

  nextQuestion: () =>
    set((state) => ({ currentQuestionIndex: state.currentQuestionIndex + 1 })),

  previousQuestion: () =>
    set((state) => ({
      currentQuestionIndex: Math.max(0, state.currentQuestionIndex - 1),
    })),

  reset: () => set(initialState),
}));

// Selector hooks for common patterns
export const useSelectedCategory = () =>
  useAgentStore((state) => state.selectedCategory);
export const useOnboardingMode = () => useAgentStore((state) => state.mode);
export const useCollectedAnswers = () =>
  useAgentStore((state) => state.collectedAnswers);
export const useCurrentQuestionIndex = () =>
  useAgentStore((state) => state.currentQuestionIndex);
