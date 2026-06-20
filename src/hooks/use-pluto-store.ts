'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Project,
  BuildPlan,
  BuildLogEntry,
  ClarifyingQuestion,
  ClarifyingAnswer,
  AskUserRequest,
} from '@/types/pluto'

export type PlutoStage =
  | 'idle'
  | 'clarifying'
  | 'planning'
  | 'review'
  | 'building'
  | 'ready'
  | 'error'

interface PlutoState {
  // Current stage of the workflow
  stage: PlutoStage

  // Initial prompt from user
  prompt: string

  // Clarifying questions from AI
  clarifyingQuestions: ClarifyingQuestion[]

  // User's answers to clarifying questions
  clarifyingAnswers: ClarifyingAnswer[]

  // Generated build plan
  buildPlan: BuildPlan | null

  // Current project (after creation)
  currentProject: Project | null

  // Build log entries
  buildLogs: BuildLogEntry[]

  // Human-in-the-loop request
  askUserRequest: AskUserRequest | null

  // Preview URL
  previewUrl: string | null

  // Error message
  error: string | null

  // Loading states
  isLoading: boolean
  loadingMessage: string | null

  // Actions
  setPrompt: (prompt: string) => void
  setStage: (stage: PlutoStage) => void
  setClarifyingQuestions: (questions: ClarifyingQuestion[]) => void
  addClarifyingAnswer: (answer: ClarifyingAnswer) => void
  setClarifyingAnswers: (answers: ClarifyingAnswer[]) => void
  setBuildPlan: (plan: BuildPlan) => void
  setCurrentProject: (project: Project) => void
  addBuildLog: (log: BuildLogEntry) => void
  clearBuildLogs: () => void
  setAskUserRequest: (request: AskUserRequest | null) => void
  setPreviewUrl: (url: string | null) => void
  setError: (error: string | null) => void
  setLoading: (isLoading: boolean, message?: string | null) => void
  reset: () => void
}

const initialState = {
  stage: 'idle' as PlutoStage,
  prompt: '',
  clarifyingQuestions: [],
  clarifyingAnswers: [],
  buildPlan: null,
  currentProject: null,
  buildLogs: [],
  askUserRequest: null,
  previewUrl: null,
  error: null,
  isLoading: false,
  loadingMessage: null,
}

export const usePlutoStore = create<PlutoState>()(
  persist(
    (set) => ({
      ...initialState,

      setPrompt: (prompt) => set({ prompt }),

      setStage: (stage) => set({ stage, error: null }),

      setClarifyingQuestions: (questions) =>
        set({ clarifyingQuestions: questions, stage: 'clarifying' }),

      addClarifyingAnswer: (answer) =>
        set((state) => ({
          clarifyingAnswers: [
            ...state.clarifyingAnswers.filter((a) => a.questionId !== answer.questionId),
            answer,
          ],
        })),

      setClarifyingAnswers: (answers) => set({ clarifyingAnswers: answers }),

      setBuildPlan: (plan) => set({ buildPlan: plan, stage: 'review' }),

      setCurrentProject: (project) => set({ currentProject: project }),

      addBuildLog: (log) =>
        set((state) => ({
          buildLogs: [...state.buildLogs, log],
        })),

      clearBuildLogs: () => set({ buildLogs: [] }),

      setAskUserRequest: (request) => set({ askUserRequest: request }),

      setPreviewUrl: (url) => set({ previewUrl: url }),

      setError: (error) => set({ error, stage: error ? 'error' : 'idle' }),

      setLoading: (isLoading, message = null) =>
        set({ isLoading, loadingMessage: message }),

      reset: () => set(initialState),
    }),
    {
      name: 'pluto-storage',
      partialize: (state) => ({
        prompt: state.prompt,
        clarifyingAnswers: state.clarifyingAnswers,
      }),
    }
  )
)

// Selector hooks for common derived state
export const useIsBuilding = () =>
  usePlutoStore((state) => state.stage === 'building')

export const useHasAllAnswers = () =>
  usePlutoStore(
    (state) =>
      state.clarifyingQuestions.length > 0 &&
      state.clarifyingAnswers.length === state.clarifyingQuestions.length
  )
