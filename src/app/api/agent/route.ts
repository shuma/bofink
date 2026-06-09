import {
  streamText,
  generateObject,
  stepCountIs,
  convertToModelMessages,
} from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { planSchema } from "@/lib/agents/plan-schema";
import { agentTools } from "@/lib/agents/tools/agent-tools";

export const maxDuration = 60;

// Phase 1: Generate a structured plan (use Haiku for speed)
async function generatePlan(userTask: string) {
  const result = await generateObject({
    model: anthropic("claude-sonnet-4-20250514"), // Same model as chat
    schema: planSchema,
    prompt: `Du är en svensk bolånerådgivare som hjälper användare planera sina bolån.

Användarens uppgift: "${userTask}"

Skapa en steg-för-steg plan för att hjälpa användaren. Varje steg ska använda ett av dessa verktyg:
- askUser: Ställ en fråga till användaren (för att samla in data som bostadens värde, inkomst, lån, etc.)
- calculateLTV: Beräkna belåningsgrad (kräver loanAmount och propertyValue)
- suggestAmortization: Föreslå amorteringstakt baserat på svenska regler (kräver loanAmount, propertyValue, yearlyIncome)
- compareBankRates: Jämför räntekostnader mellan banker (kräver loanAmount och rates)

Viktiga regler:
1. Börja ALLTID med askUser-steg för att samla in nödvändig data
2. Fråga om ett värde i taget - inte flera på samma gång
3. Använd beräkningsverktyg först när all nödvändig data har samlats in
4. Planen ska vara praktisk och hjälpa användaren förstå sin bolånesituation
5. Max 8 steg totalt (håll det enkelt)

Fält som kan samlas in via askUser:
- propertyValue: Bostadens marknadsvärde
- monthlyIncome: Månadsinkomst
- loanAmount: Total låneskuld
- interestRate: Nuvarande ränta
- address: Bostadens adress

Skapa en enkel plan på svenska.`,
  });

  return result.object;
}

// API Route handler
export async function POST(req: Request) {
  const body = await req.json();
  const { action, userTask, messages } = body;

  // Phase 1: Generate plan (explicit action)
  if (action === "plan") {
    try {
      const plan = await generatePlan(userTask);
      return Response.json({ plan });
    } catch (error) {
      console.error("Plan generation error:", error);
      return Response.json({ error: "Kunde inte skapa plan" }, { status: 500 });
    }
  }

  // Phase 2: Execute with streaming
  if (action === "execute" || messages) {
    const systemPrompt = `Du är en svensk bolånerådgivare. Du hjälper användaren steg för steg.

VIKTIGT - Följ dessa regler EXAKT:
1. Använd askUser-verktyget för att ställa EN fråga i taget
2. VÄNTA ALLTID på svar innan du går vidare till nästa fråga
3. När du använder askUser, inkludera ALLTID:
   - question: En tydlig fråga på svenska
   - field: Rätt fältnamn (propertyValue, monthlyIncome, loanAmount, interestRate, address)
   - options: 3-4 fördefinierade alternativ med label och value
   - allowCustom: true (så användaren kan skriva eget svar)

4. Efter varje svar från användaren, bekräfta kort och ställ nästa fråga
5. När alla frågor är besvarade, använd beräkningsverktygen och sammanfatta resultatet

Exempel på askUser-anrop:
{
  "question": "Vad är bostadens ungefärliga marknadsvärde?",
  "field": "propertyValue",
  "options": [
    {"label": "Under 2 miljoner", "value": "1500000"},
    {"label": "2-4 miljoner", "value": "3000000"},
    {"label": "4-6 miljoner", "value": "5000000"},
    {"label": "Över 6 miljoner", "value": "7000000"}
  ],
  "allowCustom": true,
  "inputType": "number",
  "unit": "SEK"
}

Svara alltid på svenska. Var kortfattad.`;

    // Convert UI messages to model messages
    const modelMessages = await convertToModelMessages(messages || [], {
      tools: agentTools,
    });

    const result = streamText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: systemPrompt,
      messages: modelMessages,
      tools: agentTools,
      stopWhen: stepCountIs(12),
    });

    return result.toUIMessageStreamResponse();
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}
