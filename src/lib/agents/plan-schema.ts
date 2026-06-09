import { z } from "zod/v4";

// Schema for a single step in the plan
export const planStepSchema = z.object({
  description: z
    .string()
    .describe("Kort beskrivning av vad steget gör (på svenska)"),
  tool: z
    .enum(["askUser", "calculateLTV", "suggestAmortization", "compareBankRates"])
    .describe("Vilket verktyg som ska användas för detta steg"),
  reason: z
    .string()
    .describe("Varför detta steg behövs för att lösa användarens uppgift"),
  field: z
    .string()
    .optional()
    .describe(
      "För askUser: vilket fält svaret ska mappas till (propertyValue, monthlyIncome, etc.)"
    ),
});

// Schema for the complete plan
export const planSchema = z.object({
  summary: z
    .string()
    .describe("Kort sammanfattning av vad planen kommer att åstadkomma"),
  steps: z
    .array(planStepSchema)
    .min(1)
    .max(12)
    .describe("Lista med steg som ska utföras i ordning"),
  estimatedQuestions: z
    .number()
    .int()
    .min(0)
    .describe("Uppskattat antal frågor som kommer att ställas till användaren"),
});

// Type exports
export type PlanStep = z.infer<typeof planStepSchema>;
export type Plan = z.infer<typeof planSchema>;

// Example plan for reference
export const examplePlan: Plan = {
  summary: "Samla in bolåneinformation och beräkna amorteringskrav",
  steps: [
    {
      description: "Fråga om bostadens värde",
      tool: "askUser",
      reason: "Behövs för att beräkna belåningsgrad",
      field: "propertyValue",
    },
    {
      description: "Fråga om total låneskuld",
      tool: "askUser",
      reason: "Behövs för att beräkna belåningsgrad och amortering",
      field: "loanAmount",
    },
    {
      description: "Fråga om hushållets inkomst",
      tool: "askUser",
      reason: "Behövs för att beräkna skuldkvot",
      field: "monthlyIncome",
    },
    {
      description: "Beräkna belåningsgrad",
      tool: "calculateLTV",
      reason: "Visar användarens riskprofil",
    },
    {
      description: "Föreslå amorteringstakt",
      tool: "suggestAmortization",
      reason: "Ger konkret rekommendation baserat på svenska regler",
    },
  ],
  estimatedQuestions: 3,
};
