import { streamText, tool, convertToModelMessages, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod/v4";
import { dataTools } from "@/lib/agents/tools/data-tools";

export const maxDuration = 30;

// Calculation tools (read-only)
const calculateMonthlyPayment = tool({
  description:
    "Beräkna månatlig betalning för ett lån med given ränta och amortering",
  inputSchema: z.object({
    loanAmount: z.number().describe("Lånebelopp i SEK"),
    interestRate: z.number().describe("Ränta i procent"),
    yearlyAmortization: z.number().describe("Årlig amortering i SEK"),
  }),
  execute: async ({ loanAmount, interestRate, yearlyAmortization }) => {
    const monthlyInterest = (loanAmount * (interestRate / 100)) / 12;
    const monthlyAmortization = yearlyAmortization / 12;
    const total = monthlyInterest + monthlyAmortization;
    const netTotal = monthlyInterest * 0.7 + monthlyAmortization;

    return {
      monthlyInterest: Math.round(monthlyInterest),
      monthlyAmortization: Math.round(monthlyAmortization),
      total: Math.round(total),
      netTotal: Math.round(netTotal),
    };
  },
});

const compareRates = tool({
  description: "Jämför ränteerbjudanden från olika banker",
  inputSchema: z.object({
    loanAmount: z.number().describe("Lånebelopp i SEK"),
    currentRate: z.number().describe("Nuvarande ränta i procent"),
    newRate: z.number().describe("Ny ränta i procent"),
  }),
  execute: async ({ loanAmount, currentRate, newRate }) => {
    const currentYearlyCost = loanAmount * (currentRate / 100);
    const newYearlyCost = loanAmount * (newRate / 100);
    const yearlySavings = currentYearlyCost - newYearlyCost;
    const monthlySavings = yearlySavings / 12;

    return {
      currentYearlyCost: Math.round(currentYearlyCost),
      newYearlyCost: Math.round(newYearlyCost),
      yearlySavings: Math.round(yearlySavings),
      monthlySavings: Math.round(monthlySavings),
      netMonthlySavings: Math.round(monthlySavings * 0.7),
    };
  },
});

const suggestAmortization = tool({
  description:
    "Föreslå amorteringstakt baserat på svenska regler och kundens situation",
  inputSchema: z.object({
    loanAmount: z.number().describe("Total låneskuld i SEK"),
    propertyValue: z.number().describe("Bostadens värde i SEK"),
    yearlyIncome: z.number().describe("Årsinkomst i SEK"),
  }),
  execute: async ({ loanAmount, propertyValue, yearlyIncome }) => {
    const ltv = (loanAmount / propertyValue) * 100;
    const debtRatio = loanAmount / yearlyIncome;

    let requiredRate = 0;
    const explanation: string[] = [];

    if (ltv > 70) {
      requiredRate = 2;
      explanation.push("Belåningsgrad >70% kräver 2% amortering");
    } else if (ltv > 50) {
      requiredRate = 1;
      explanation.push("Belåningsgrad 50-70% kräver 1% amortering");
    } else {
      explanation.push("Belåningsgrad <50% - inget amorteringskrav");
    }

    if (debtRatio > 4.5) {
      requiredRate += 1;
      explanation.push("Skuldkvot >4.5x kräver ytterligare 1%");
    }

    const yearlyAmortization = loanAmount * (requiredRate / 100);
    const monthlyAmortization = yearlyAmortization / 12;

    return {
      ltv: Math.round(ltv * 10) / 10,
      debtRatio: Math.round(debtRatio * 10) / 10,
      requiredRate,
      yearlyAmortization: Math.round(yearlyAmortization),
      monthlyAmortization: Math.round(monthlyAmortization),
      explanation: explanation.join(". "),
    };
  },
});

// All tools combined for conversion
const allTools = {
  calculateMonthlyPayment,
  compareRates,
  suggestAmortization,
  ...dataTools,
};

export async function POST(req: Request) {
  const { messages, context } = await req.json();

  // Convert UIMessage to ModelMessage format
  const modelMessages = await convertToModelMessages(messages, {
    tools: allTools,
  });

  // Build system prompt with loan context
  const systemPrompt = `Du är en svensk bolånerådgivare som hjälper användare att fylla i och hantera sina bolåneuppgifter.

Du har tillgång till verktyg för att:
- Lägga till, uppdatera och ta bort lån (addLoan, updateLoan, removeLoan)
- Sätta bostadens värde (setPropertyValue)
- Sätta hushållets inkomst (setIncome)
- Sätta användarens födelseår (setBirthYear)
- Sätta bostadens adress (setAddress)
- Sätta lånetid i år (setYears)
- Hämta lånesammanfattning med ID (getLoanSummary)
- Beräkna månadskostnader (calculateMonthlyPayment)
- Jämföra räntor (compareRates)
- Föreslå amortering baserat på svenska regler (suggestAmortization)
- Generera kontextbaserade förslag på frågor (generateSuggestions)

Instruktioner:
1. Fråga användaren om nödvändig information om de inte angett den
2. Använd verktygen för att uppdatera data baserat på användarens svar
3. Bekräfta alltid ändringar du gör
4. Ge råd baserat på svenska bolåneregler

Svenska regler du ska känna till:
- Amorteringskrav: >70% LTV = 2%/år, 50-70% LTV = 1%/år, >4.5x skuldkvot = +1%/år
- Ränteavdrag: 30% av räntekostnaden är avdragsgill

Aktuell kundinformation:
- Adress: ${context?.adress || "Ej angiven"}
- Bostadens värde: ${context?.boVarde?.toLocaleString("sv-SE") || "Ej angivet"} SEK
- Månadsinkomst: ${context?.inkomst?.toLocaleString("sv-SE") || "Ej angiven"} SEK
- Födelseår: ${context?.fodelsear || "Ej angivet"}
- Total låneskuld: ${context?.totalLoan?.toLocaleString("sv-SE") || "0"} SEK
- Belåningsgrad (LTV): ${context?.ltv?.toFixed(1) || "N/A"}%
- Skuldkvot: ${context?.debtRatio?.toFixed(1) || "N/A"}x årsinkomst
- Snittränta: ${context?.weightedRate?.toFixed(2) || "N/A"}%
- Månadskostnad (netto): ${context?.monthlyNetTotal?.toLocaleString("sv-SE") || "0"} SEK

Lån (med ID för referens):
${
  context?.loans
    ?.map(
      (l: {
        id: string;
        namn: string;
        belopp: number;
        ranta: number;
        bank: string;
        typ: string;
      }) =>
        `- ID: ${l.id} | ${l.namn}: ${l.belopp.toLocaleString("sv-SE")} SEK @ ${l.ranta}% (${l.bank}, ${l.typ})`
    )
    .join("\n") || "Inga lån registrerade"
}

Svara alltid på svenska. Var koncis men informativ.`;

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: systemPrompt,
    messages: modelMessages,
    tools: allTools,
    stopWhen: stepCountIs(5), // Allow up to 5 tool call rounds so AI can confirm after executing tools
  });

  return result.toUIMessageStreamResponse();
}
