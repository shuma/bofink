import { tool, generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod/v4";

// Tool action types for client-side state updates
export type ToolAction =
  | { action: "updateLoan"; data: LoanUpdate }
  | { action: "addLoan"; data: LoanAdd }
  | { action: "removeLoan"; data: { loanId: string } }
  | { action: "setPropertyValue"; data: { value: number } }
  | { action: "setIncome"; data: { monthlyIncome: number } }
  | { action: "setAddress"; data: { address: string } }
  | { action: "setYears"; data: { years: 10 | 20 | 30 } }
  | { action: "getLoanSummary"; data: LoanSummary }
  | { action: "generateSuggestions"; data: { suggestions: string[] } };

interface LoanUpdate {
  loanId: string;
  namn?: string;
  belopp?: number;
  ranta?: number;
  bank?: string;
  typ?: string;
  amortering?: number;
}

interface LoanAdd {
  namn: string;
  belopp: number;
  ranta: number;
  bank: string;
  typ: string;
  amortering?: number;
}

interface LoanSummary {
  loans: Array<{
    id: string;
    namn: string;
    belopp: number;
    ranta: number;
    bank: string;
    typ: string;
  }>;
  propertyValue: number;
  monthlyIncome: number;
  address: string;
  years: number;
  totalLoan: number;
}

// Update existing loan
export const updateLoan = tool({
  description:
    "Uppdatera ett befintligt lån. Använd getLoanSummary först för att hitta lånets ID.",
  inputSchema: z.object({
    loanId: z.string().describe("ID för lånet som ska uppdateras"),
    namn: z.string().optional().describe("Nytt namn/beskrivning för lånet"),
    belopp: z.number().optional().describe("Nytt lånebelopp i SEK"),
    ranta: z.number().optional().describe("Ny ränta i procent"),
    bank: z.string().optional().describe("Ny bank"),
    typ: z
      .enum(["rörlig", "1 år", "3 år", "5 år"])
      .optional()
      .describe("Ny räntebindningstyp"),
    amortering: z.number().optional().describe("Ny årlig amortering i SEK"),
  }),
  execute: async (input) => {
    return {
      action: "updateLoan" as const,
      data: input,
      message: `Uppdaterade lån ${input.loanId}`,
    };
  },
});

// Add new loan
export const addLoan = tool({
  description: "Lägg till ett nytt lån",
  inputSchema: z.object({
    namn: z.string().describe("Lånets namn/beskrivning"),
    belopp: z.number().describe("Lånebelopp i SEK"),
    ranta: z.number().describe("Ränta i procent"),
    bank: z.string().describe("Bankens namn"),
    typ: z
      .enum(["rörlig", "1 år", "3 år", "5 år"])
      .describe("Räntebindningstyp"),
    amortering: z.number().optional().describe("Årlig amortering i SEK"),
  }),
  execute: async (input) => {
    return {
      action: "addLoan" as const,
      data: {
        ...input,
        amortering: input.amortering ?? 0,
      },
      message: `Lade till nytt lån: ${input.namn} på ${input.belopp.toLocaleString("sv-SE")} SEK @ ${input.ranta}% från ${input.bank}`,
    };
  },
});

// Remove loan
export const removeLoan = tool({
  description:
    "Ta bort ett lån. Använd getLoanSummary först för att hitta lånets ID.",
  inputSchema: z.object({
    loanId: z.string().describe("ID för lånet som ska tas bort"),
  }),
  execute: async (input) => {
    return {
      action: "removeLoan" as const,
      data: { loanId: input.loanId },
      message: `Tog bort lån ${input.loanId}`,
    };
  },
});

// Set property value
export const setPropertyValue = tool({
  description: "Sätt bostadens marknadsvärde",
  inputSchema: z.object({
    value: z.number().describe("Bostadens värde i SEK"),
  }),
  execute: async (input) => {
    return {
      action: "setPropertyValue" as const,
      data: { value: input.value },
      message: `Satte bostadens värde till ${input.value.toLocaleString("sv-SE")} SEK`,
    };
  },
});

// Set income
export const setIncome = tool({
  description: "Sätt hushållets månadsinkomst",
  inputSchema: z.object({
    monthlyIncome: z.number().describe("Månadsinkomst i SEK"),
  }),
  execute: async (input) => {
    return {
      action: "setIncome" as const,
      data: { monthlyIncome: input.monthlyIncome },
      message: `Satte månadsinkomst till ${input.monthlyIncome.toLocaleString("sv-SE")} SEK`,
    };
  },
});

// Set address
export const setAddress = tool({
  description: "Sätt bostadens adress",
  inputSchema: z.object({
    address: z.string().describe("Bostadens adress"),
  }),
  execute: async (input) => {
    return {
      action: "setAddress" as const,
      data: { address: input.address },
      message: `Satte adress till ${input.address}`,
    };
  },
});

// Set years
export const setYears = tool({
  description: "Sätt lånetid i år",
  inputSchema: z.object({
    years: z
      .enum(["10", "20", "30"])
      .transform((v) => parseInt(v) as 10 | 20 | 30)
      .describe("Lånetid: 10, 20 eller 30 år"),
  }),
  execute: async (input) => {
    return {
      action: "setYears" as const,
      data: { years: input.years },
      message: `Satte lånetid till ${input.years} år`,
    };
  },
});

// Get loan summary - this is a read-only tool that receives context from the API
export const getLoanSummary = tool({
  description:
    "Hämta en sammanfattning av alla lån och inställningar. Använd detta för att se aktuella låne-ID innan du uppdaterar eller tar bort lån.",
  inputSchema: z.object({}),
  execute: async () => {
    // This tool doesn't modify state, it returns a signal for the client
    // The actual data is injected via the system prompt context
    return {
      action: "getLoanSummary" as const,
      data: null,
      message:
        "Hämtar lånesammanfattning... (se aktuell data i systemkontexten)",
    };
  },
});

// Generate context-aware suggestions using Claude
export const generateSuggestions = tool({
  description:
    "Generera kontextbaserade förslag på frågor användaren kan ställa baserat på deras nuvarande bolånedata. Använd detta för att hjälpa användaren veta vad de kan fråga om härnäst.",
  inputSchema: z.object({
    adress: z.string().optional().describe("Bostadens adress"),
    boVarde: z.number().optional().describe("Bostadens värde i SEK"),
    inkomst: z.number().optional().describe("Månadsinkomst i SEK"),
    totalLoan: z.number().optional().describe("Total låneskuld i SEK"),
    loanCount: z.number().optional().describe("Antal lån"),
    ltv: z.number().optional().describe("Belåningsgrad i procent"),
    debtRatio: z.number().optional().describe("Skuldkvot"),
  }),
  execute: async (context) => {
    const prompt = `Du är en svensk bolånerådgivare. Baserat på användarens nuvarande bolånedata, föreslå 2-4 relevanta frågor som användaren kan ställa härnäst.

Aktuell kundinformation:
- Adress: ${context.adress || "Ej angiven"}
- Bostadens värde: ${context.boVarde ? `${context.boVarde.toLocaleString("sv-SE")} SEK` : "Ej angivet"}
- Månadsinkomst: ${context.inkomst ? `${context.inkomst.toLocaleString("sv-SE")} SEK` : "Ej angiven"}
- Antal lån: ${context.loanCount || 0}
- Total låneskuld: ${context.totalLoan ? `${context.totalLoan.toLocaleString("sv-SE")} SEK` : "0 SEK"}
- Belåningsgrad (LTV): ${context.ltv ? `${context.ltv.toFixed(1)}%` : "N/A"}
- Skuldkvot: ${context.debtRatio ? `${context.debtRatio.toFixed(1)}x` : "N/A"}

Regler för förslag:
1. Om data saknas, föreslå att användaren anger det (t.ex. "Ange bostadens värde")
2. Om grunddata finns, föreslå beräkningar (t.ex. "Beräkna min månadskostnad")
3. Om flera lån finns, föreslå jämförelser (t.ex. "Jämför mina räntor")
4. Om allt data finns, föreslå optimering (t.ex. "Hur kan jag minska räntekostnaden?")
5. Håll förslagen korta och konkreta (max 6-8 ord)
6. Skriv på svenska
7. Formulera som frågor eller uppmaningar användaren skulle skriva i en chatt

Returnera 2-4 förslag baserat på vad som är mest relevant för användarens situation.`;

    try {
      const result = await generateObject({
        model: anthropic("claude-haiku-3-5-20241022"),
        schema: z.object({
          suggestions: z
            .array(z.string())
            .max(4)
            .describe("Array of suggested questions in Swedish"),
        }),
        prompt,
      });

      return {
        action: "generateSuggestions" as const,
        data: { suggestions: result.object.suggestions },
        message: `Genererade ${result.object.suggestions.length} förslag`,
      };
    } catch (error) {
      console.error("Error generating suggestions:", error);
      return {
        action: "generateSuggestions" as const,
        data: { suggestions: [] },
        message: "Kunde inte generera förslag",
      };
    }
  },
});

// Export all data tools
export const dataTools = {
  updateLoan,
  addLoan,
  removeLoan,
  setPropertyValue,
  setIncome,
  setAddress,
  setYears,
  getLoanSummary,
  generateSuggestions,
};
