import { z } from 'zod'

// Schema for a single clarifying question
export const clarifyingQuestionSchema = z.object({
  id: z.string().describe('Unique identifier for the question'),
  question: z.string().describe('The question to ask the user'),
  options: z
    .array(
      z.object({
        label: z.string().describe('Display label for the option'),
        value: z.string().describe('Value to use when selected'),
      })
    )
    .describe('Options for the user to choose from (2-6 options)'),
  multiSelect: z
    .boolean()
    .optional()
    .describe('Whether the user can select multiple options'),
})

// Schema for the AI response with clarifying questions
export const clarifyingQuestionsResponseSchema = z.object({
  needsClarification: z
    .boolean()
    .describe('Whether clarification is needed before planning'),
  questions: z
    .array(clarifyingQuestionSchema)
    .describe('List of clarifying questions (max 4)'),
  reasoning: z
    .string()
    .describe('Brief explanation of why these questions are needed'),
})

// Schema for a build plan step
export const buildPlanStepSchema = z.object({
  id: z.string().describe('Unique identifier for the step'),
  title: z.string().describe('Short title for the step'),
  description: z.string().describe('What this step will accomplish'),
  type: z
    .enum(['file', 'command', 'config'])
    .describe('Type of operation: file write, command execution, or config change'),
})

// Schema for the complete build plan
export const buildPlanSchema = z.object({
  name: z.string().describe('Name of the application'),
  description: z
    .string()
    .describe('Brief description of what the app does (1-2 sentences)'),
  features: z
    .array(z.string())
    .describe('Key features to implement (1-8 features)'),
  techStack: z
    .array(z.string())
    .describe('Technologies being used (e.g., Vite, React, React Router, Tailwind CSS, shadcn/ui)'),
  steps: z
    .array(buildPlanStepSchema)
    .describe('Ordered list of steps to build the application (3-20 steps)'),
})

// Schema for follow-up modification requests
export const modificationRequestSchema = z.object({
  type: z
    .enum(['add_feature', 'fix_bug', 'modify', 'refactor'])
    .describe('Type of modification requested'),
  description: z.string().describe('What the user wants changed'),
  affectedFiles: z
    .array(z.string())
    .optional()
    .describe('Files that will likely need changes'),
  steps: z
    .array(buildPlanStepSchema)
    .describe('Steps to implement the modification'),
})

// Type exports
export type ClarifyingQuestion = z.infer<typeof clarifyingQuestionSchema>
export type ClarifyingQuestionsResponse = z.infer<typeof clarifyingQuestionsResponseSchema>
export type BuildPlanStep = z.infer<typeof buildPlanStepSchema>
export type BuildPlan = z.infer<typeof buildPlanSchema>
export type ModificationRequest = z.infer<typeof modificationRequestSchema>
