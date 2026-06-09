import { tool } from "ai";
import { z } from "zod/v4";

// Output schema for askUser tool (what the user responds with)
const askUserOutputSchema = z.object({
  field: z.string().describe("The field that was answered"),
  value: z.union([z.string(), z.number(), z.array(z.string())]).describe("The user's answer"),
  success: z.boolean().describe("Whether the answer was provided"),
});

// askUser tool - NO execute function = human-in-the-loop
// When this tool is called, the AI will wait for user input
export const askUser = tool({
  description:
    "Ställ en fråga till användaren och vänta på deras svar. Använd detta för att samla in information steg för steg.",
  inputSchema: z.object({
    question: z.string().describe("Frågan att ställa till användaren"),
    field: z
      .enum([
        "propertyValue",
        "monthlyIncome",
        "loanAmount",
        "interestRate",
        "address",
        "birthYear",
        "loanType",
        "bank",
        "amortization",
        "years",
        "loanName",
        "loanCount",
        "custom",
      ])
      .describe("Fältet som svaret ska mappas till i mortgage store"),
    options: z
      .array(
        z.object({
          label: z.string().describe("Visningstext för alternativet"),
          value: z.string().describe("Värdet som sparas"),
          description: z.string().optional().describe("Ytterligare förklaring"),
        })
      )
      .optional()
      .describe("Fördefinierade svarsalternativ (flerval)"),
    allowMultiple: z
      .boolean()
      .optional()
      .describe("Om användaren kan välja flera alternativ"),
    allowCustom: z
      .boolean()
      .optional()
      .describe("Om användaren kan skriva ett eget svar"),
    inputType: z
      .enum(["text", "number", "select"])
      .optional()
      .describe("Typ av input om inga options finns"),
    placeholder: z.string().optional().describe("Platshållartext för input"),
    unit: z
      .string()
      .optional()
      .describe("Enhet att visa efter input (t.ex. SEK, %)"),
  }),
  outputSchema: askUserOutputSchema,
  // NO execute function - this triggers human-in-the-loop
});

// Auto-execute tool: Calculate loan-to-value ratio
export const calculateLTV = tool({
  description:
    "Beräkna belåningsgrad (LTV) baserat på lånebelopp och bostadens värde",
  inputSchema: z.object({
    loanAmount: z.number().describe("Total låneskuld i SEK"),
    propertyValue: z.number().describe("Bostadens marknadsvärde i SEK"),
  }),
  execute: async ({ loanAmount, propertyValue }) => {
    if (propertyValue <= 0) {
      return { error: "Bostadens värde måste vara större än 0" };
    }

    const ltv = (loanAmount / propertyValue) * 100;
    const ltvRounded = Math.round(ltv * 10) / 10;

    let riskLevel: "low" | "medium" | "high";
    let description: string;

    if (ltv <= 50) {
      riskLevel = "low";
      description = "Låg belåningsgrad. Inget amorteringskrav.";
    } else if (ltv <= 70) {
      riskLevel = "medium";
      description = "Medel belåningsgrad. Amorteringskrav 1% per år.";
    } else if (ltv <= 85) {
      riskLevel = "high";
      description = "Hög belåningsgrad. Amorteringskrav 2% per år.";
    } else {
      riskLevel = "high";
      description =
        "Mycket hög belåningsgrad (>85%). De flesta banker kräver max 85% LTV.";
    }

    return {
      ltv: ltvRounded,
      riskLevel,
      description,
      loanAmount,
      propertyValue,
    };
  },
});

// Auto-execute tool: Suggest amortization based on Swedish rules
export const suggestAmortization = tool({
  description:
    "Föreslå amorteringstakt baserat på svenska regler (amorteringskrav)",
  inputSchema: z.object({
    loanAmount: z.number().describe("Total låneskuld i SEK"),
    propertyValue: z.number().describe("Bostadens marknadsvärde i SEK"),
    yearlyIncome: z.number().describe("Hushållets årsinkomst i SEK"),
  }),
  execute: async ({ loanAmount, propertyValue, yearlyIncome }) => {
    const ltv = (loanAmount / propertyValue) * 100;
    const debtRatio = loanAmount / yearlyIncome;

    let requiredRate = 0;
    const rules: string[] = [];

    // LTV-based amortization requirement
    if (ltv > 70) {
      requiredRate = 2;
      rules.push(`Belåningsgrad ${ltv.toFixed(1)}% > 70% → 2% amortering/år`);
    } else if (ltv > 50) {
      requiredRate = 1;
      rules.push(
        `Belåningsgrad ${ltv.toFixed(1)}% mellan 50-70% → 1% amortering/år`
      );
    } else {
      rules.push(
        `Belåningsgrad ${ltv.toFixed(1)}% < 50% → inget grundkrav på amortering`
      );
    }

    // Debt ratio additional requirement
    if (debtRatio > 4.5) {
      requiredRate += 1;
      rules.push(
        `Skuldkvot ${debtRatio.toFixed(1)}x > 4.5x årsinkomst → +1% amortering/år`
      );
    } else {
      rules.push(
        `Skuldkvot ${debtRatio.toFixed(1)}x ≤ 4.5x årsinkomst → inget extra krav`
      );
    }

    const yearlyAmortization = loanAmount * (requiredRate / 100);
    const monthlyAmortization = yearlyAmortization / 12;

    return {
      ltv: Math.round(ltv * 10) / 10,
      debtRatio: Math.round(debtRatio * 10) / 10,
      requiredRate,
      yearlyAmortization: Math.round(yearlyAmortization),
      monthlyAmortization: Math.round(monthlyAmortization),
      rules,
      summary: `Minsta amortering: ${requiredRate}% per år (${Math.round(monthlyAmortization).toLocaleString("sv-SE")} kr/mån)`,
    };
  },
});

// Auto-execute tool: Compare bank rates
export const compareBankRates = tool({
  description: "Jämför räntekostnader mellan olika banker eller räntenivåer",
  inputSchema: z.object({
    loanAmount: z.number().describe("Lånebelopp i SEK"),
    rates: z
      .array(
        z.object({
          bank: z.string().describe("Bankens namn"),
          rate: z.number().describe("Ränta i procent"),
        })
      )
      .min(1)
      .describe("Lista med banker och deras räntor att jämföra"),
  }),
  execute: async ({ loanAmount, rates }) => {
    const comparisons = rates.map(({ bank, rate }) => {
      const yearlyInterest = loanAmount * (rate / 100);
      const monthlyInterest = yearlyInterest / 12;
      const netMonthlyInterest = monthlyInterest * 0.7; // After 30% tax deduction

      return {
        bank,
        rate,
        yearlyInterest: Math.round(yearlyInterest),
        monthlyInterest: Math.round(monthlyInterest),
        netMonthlyInterest: Math.round(netMonthlyInterest),
      };
    });

    // Sort by rate (lowest first)
    comparisons.sort((a, b) => a.rate - b.rate);

    // Calculate savings compared to highest rate
    const highest = comparisons[comparisons.length - 1];
    const lowest = comparisons[0];

    const yearlySavings = highest.yearlyInterest - lowest.yearlyInterest;
    const monthlySavings = highest.monthlyInterest - lowest.monthlyInterest;

    return {
      comparisons,
      bestOption: lowest.bank,
      worstOption: highest.bank,
      potentialYearlySavings: Math.round(yearlySavings),
      potentialMonthlySavings: Math.round(monthlySavings),
      potentialNetMonthlySavings: Math.round(monthlySavings * 0.7),
      summary:
        comparisons.length > 1
          ? `${lowest.bank} har lägst ränta (${lowest.rate}%). Du sparar ${Math.round(monthlySavings).toLocaleString("sv-SE")} kr/mån jämfört med ${highest.bank}.`
          : `${lowest.bank}: ${lowest.rate}% ränta = ${Math.round(lowest.netMonthlyInterest).toLocaleString("sv-SE")} kr/mån efter ränteavdrag.`,
    };
  },
});

// Export all agent tools
export const agentTools = {
  askUser,
  calculateLTV,
  suggestAmortization,
  compareBankRates,
};

// Type for askUser tool arguments (for client-side handling)
export type AskUserArgs = {
  question: string;
  field: string;
  options?: Array<{
    label: string;
    value: string;
    description?: string;
  }>;
  allowMultiple?: boolean;
  allowCustom?: boolean;
  inputType?: "text" | "number" | "select";
  placeholder?: string;
  unit?: string;
};
