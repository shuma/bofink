"use client";

import { useMemo, useEffect, useRef, useCallback, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMortgageStore, type Years } from "@/hooks/use-mortgage-store";
import { useChatStore } from "@/hooks/use-chat-store";
import { useCalculations } from "@/hooks/use-calculations";
import { useSuggestions } from "@/hooks/use-suggestions";
import { ChatMessages, ChatMessage } from "./chat-messages";
import { QuestionCard } from "@/components/agent/question-card";
import type { AskUserArgs } from "@/lib/agents/tools/agent-tools";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTools,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
} from "@/components/ai-elements/prompt-input";
import { PromptInputAttachments } from "@/components/ai-elements/prompt-input-attachments";
import type { FileUIPart } from "ai";
import { SuggestionButton } from "./suggestion-button";

// Tool result action types
interface ToolResultAction {
  action: string;
  data: unknown;
  message?: string;
}

interface ChatContainerProps {
  chatId: string;
}

// Follow-up questions for missing data after Insurely import
const FOLLOWUP_QUESTIONS: Array<{
  field: string;
  question: string;
  inputType: "text" | "number";
  placeholder: string;
  unit?: string;
  checkMissing: (state: { boVarde: number; inkomst: number }) => boolean;
}> = [
  {
    field: "propertyValue",
    question: "Vad är bostadens uppskattade värde?",
    inputType: "number",
    placeholder: "T.ex. 3 500 000",
    unit: "kr",
    checkMissing: (state) => state.boVarde === 0,
  },
  {
    field: "monthlyIncome",
    question: "Vad är din månadsinkomst före skatt?",
    inputType: "number",
    placeholder: "T.ex. 45 000",
    unit: "kr",
    checkMissing: (state) => state.inkomst === 0,
  },
];

export function ChatContainer({ chatId }: ChatContainerProps) {
  const processedToolCalls = useRef<Set<string>>(new Set());
  const hasProcessedInsurelyImport = useRef(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { messages: storedMessages, setMessages: setStoredMessages } = useChatStore();

  // State for direct follow-up questions (not via AI)
  const [followupQuestionIndex, setFollowupQuestionIndex] = useState<number | null>(null);
  const [pendingFollowupQuestions, setPendingFollowupQuestions] = useState<typeof FOLLOWUP_QUESTIONS>([]);

  const {
    loans,
    boVarde,
    inkomst,
    adress,
    years,
    fodelsear,
    addLoan,
    updateLoan,
    removeLoan,
    setBoVarde,
    setInkomst,
    setFodelsear,
    setAdress,
    setYears,
  } = useMortgageStore();

  const { totalLoan, ltv, debtRatio, weightedRate, monthlyNetTotal } =
    useCalculations();

  // Build context to send with each message (include loan IDs for tool operations)
  const loanContext = useMemo(
    () => ({
      adress,
      boVarde,
      inkomst,
      years,
      fodelsear,
      totalLoan,
      ltv,
      debtRatio,
      weightedRate,
      monthlyNetTotal,
      loans: loans.map((l) => ({
        id: l.id,
        namn: l.namn,
        belopp: l.belopp,
        ranta: l.ranta,
        bank: l.bank,
        typ: l.typ,
      })),
    }),
    [
      adress,
      boVarde,
      inkomst,
      years,
      fodelsear,
      totalLoan,
      ltv,
      debtRatio,
      weightedRate,
      monthlyNetTotal,
      loans,
    ]
  );

  // Create transport with loan context
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { context: loanContext },
      }),
    [loanContext]
  );

  const { messages, sendMessage, status, setMessages, stop, addToolResult } = useChat({
    id: chatId,
    transport,
    messages: storedMessages,
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Sync messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      setStoredMessages(messages);
    }
  }, [messages, setStoredMessages]);

  // Set up follow-up questions after Insurely import
  useEffect(() => {
    const source = searchParams.get("source");
    if (
      source === "insurely" &&
      !hasProcessedInsurelyImport.current &&
      loans.length > 0
    ) {
      hasProcessedInsurelyImport.current = true;

      // Clear the query param
      router.replace("/dashboard", { scroll: false });

      // Find which questions need to be asked
      const missingQuestions = FOLLOWUP_QUESTIONS.filter((q) =>
        q.checkMissing({ boVarde, inkomst })
      );

      if (missingQuestions.length > 0) {
        setPendingFollowupQuestions(missingQuestions);
        setFollowupQuestionIndex(0);
      }
    }
  }, [searchParams, loans.length, boVarde, inkomst, router]);

  // Process tool results and update store
  useEffect(() => {
    messages.forEach((message) => {
      if (message.parts) {
        message.parts.forEach((part) => {
          // Tool parts have type "tool-{toolName}" (e.g., "tool-setAddress")
          if (part.type.startsWith("tool-") && "state" in part && part.state === "output-available") {
            const toolCallId = part.toolCallId;

            // Skip if already processed
            if (processedToolCalls.current.has(toolCallId)) {
              return;
            }

            const result = part.output as ToolResultAction;
            console.log("[Tool Result]", part.type, result); // Debug logging
            if (!result || typeof result.action !== "string") return;

            // Mark as processed before handling
            processedToolCalls.current.add(toolCallId);

            // Handle different actions
            switch (result.action) {
              case "addLoan": {
                const data = result.data as {
                  namn: string;
                  belopp: number;
                  ranta: number;
                  bank: string;
                  typ: string;
                  amortering?: number;
                };
                addLoan({
                  namn: data.namn,
                  belopp: data.belopp,
                  ranta: data.ranta,
                  bank: data.bank,
                  typ: data.typ,
                  amortering: data.amortering ?? 0,
                  rantaForfall: "",
                  agare: [],
                });
                break;
              }
              case "updateLoan": {
                const data = result.data as {
                  loanId: string;
                  namn?: string;
                  belopp?: number;
                  ranta?: number;
                  bank?: string;
                  typ?: string;
                  amortering?: number;
                };
                const updates: Record<string, unknown> = {};
                if (data.namn !== undefined) updates.namn = data.namn;
                if (data.belopp !== undefined) updates.belopp = data.belopp;
                if (data.ranta !== undefined) updates.ranta = data.ranta;
                if (data.bank !== undefined) updates.bank = data.bank;
                if (data.typ !== undefined) updates.typ = data.typ;
                if (data.amortering !== undefined)
                  updates.amortering = data.amortering;
                updateLoan(data.loanId, updates);
                break;
              }
              case "removeLoan": {
                const data = result.data as { loanId: string };
                removeLoan(data.loanId);
                break;
              }
              case "setPropertyValue": {
                const data = result.data as { value: number };
                setBoVarde(data.value);
                break;
              }
              case "setIncome": {
                const data = result.data as { monthlyIncome: number };
                setInkomst(data.monthlyIncome);
                break;
              }
              case "setBirthYear": {
                const data = result.data as { birthYear: number };
                setFodelsear(data.birthYear);
                break;
              }
              case "setAddress": {
                const data = result.data as { address: string };
                setAdress(data.address);
                break;
              }
              case "setYears": {
                const data = result.data as { years: Years };
                setYears(data.years);
                break;
              }
              // getLoanSummary is read-only, no state update needed
            }
          }
        });
      }
    });
  }, [
    messages,
    addLoan,
    updateLoan,
    removeLoan,
    setBoVarde,
    setInkomst,
    setFodelsear,
    setAdress,
    setYears,
  ]);

  // Find pending askUser tool call (human-in-the-loop)
  // For tools without an execute function, the state will be "input-available" when waiting for user input
  const pendingQuestion = useMemo(() => {
    for (const message of messages) {
      if (message.parts) {
        for (const part of message.parts) {
          // Check for askUser tool call that's waiting for input
          // Tool parts have type like "tool-askUser" and state "input-available" when waiting for result
          if (
            part.type === "tool-askUser" &&
            "state" in part &&
            part.state === "input-available" &&
            "input" in part
          ) {
            return {
              toolCallId: (part as { toolCallId: string }).toolCallId,
              args: (part as { input: unknown }).input as AskUserArgs,
            };
          }
        }
      }
    }
    return null;
  }, [messages]);

  // Handle answering the question
  const handleQuestionAnswer = useCallback(
    (value: string | number | string[]) => {
      if (!pendingQuestion) return;

      // Submit the tool result
      addToolResult({
        toolCallId: pendingQuestion.toolCallId,
        tool: "askUser",
        output: {
          field: pendingQuestion.args.field,
          value,
          success: true,
        },
      });
    },
    [pendingQuestion, addToolResult]
  );

  // Handle skipping the question
  const handleQuestionSkip = useCallback(() => {
    if (!pendingQuestion) return;

    // Submit empty result to skip
    addToolResult({
      toolCallId: pendingQuestion.toolCallId,
      tool: "askUser",
      output: {
        field: pendingQuestion.args.field,
        value: "",
        success: false,
      },
    });
  }, [pendingQuestion, addToolResult]);

  // Get current follow-up question (direct, not via AI)
  const currentFollowupQuestion = useMemo(() => {
    if (followupQuestionIndex === null || pendingFollowupQuestions.length === 0) {
      return null;
    }
    return pendingFollowupQuestions[followupQuestionIndex] || null;
  }, [followupQuestionIndex, pendingFollowupQuestions]);

  // Handle answering a follow-up question
  const handleFollowupAnswer = useCallback(
    (value: string | number | string[]) => {
      if (!currentFollowupQuestion || followupQuestionIndex === null) return;

      const numValue = typeof value === "number" ? value : parseFloat(String(value).replace(/\s/g, ""));

      // Update the store based on the field
      if (currentFollowupQuestion.field === "propertyValue" && !isNaN(numValue)) {
        setBoVarde(numValue);
      } else if (currentFollowupQuestion.field === "monthlyIncome" && !isNaN(numValue)) {
        setInkomst(numValue);
      }

      // Move to next question or finish
      if (followupQuestionIndex < pendingFollowupQuestions.length - 1) {
        setFollowupQuestionIndex(followupQuestionIndex + 1);
      } else {
        // All questions answered
        setFollowupQuestionIndex(null);
        setPendingFollowupQuestions([]);
      }
    },
    [currentFollowupQuestion, followupQuestionIndex, pendingFollowupQuestions.length, setBoVarde, setInkomst]
  );

  // Handle skipping a follow-up question
  const handleFollowupSkip = useCallback(() => {
    if (followupQuestionIndex === null) return;

    // Move to next question or finish
    if (followupQuestionIndex < pendingFollowupQuestions.length - 1) {
      setFollowupQuestionIndex(followupQuestionIndex + 1);
    } else {
      setFollowupQuestionIndex(null);
      setPendingFollowupQuestions([]);
    }
  }, [followupQuestionIndex, pendingFollowupQuestions.length]);

  // Convert AI SDK messages to our format
  const formattedMessages: ChatMessage[] = messages.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content:
      m.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("") || "",
  }));

  const handleSubmit = async ({ text, files }: { text: string; files: FileUIPart[] }) => {
    if (!text.trim() && files.length === 0) return;
    if (isLoading) return;
    await sendMessage({ text: text.trim(), files });
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage({ text: suggestion });
  };

  const { suggestions, isLoading: suggestionsLoading } = useSuggestions();

  // Only show suggestions when user has entered some mortgage data, suggestions are loaded, and no pending question
  const hasData = loans.length > 0 || boVarde > 0 || inkomst > 0 || adress !== "";
  const showSuggestions = hasData && suggestions.length > 0 && !suggestionsLoading && !pendingQuestion && !currentFollowupQuestion;

  return (
    <div className="flex h-full flex-col">
      <ChatMessages
        messages={formattedMessages}
        isLoading={isLoading && !pendingQuestion && !currentFollowupQuestion}
        onStarterClick={handleSuggestionClick}
      />
      <div className="relative flex-shrink-0 px-5 pb-5 pt-4">
        {/* Question Card for pending askUser tool call */}
        {pendingQuestion && (
          <div className="mb-4">
            <QuestionCard
              question={pendingQuestion.args}
              onAnswer={handleQuestionAnswer}
              onSkip={handleQuestionSkip}
            />
          </div>
        )}
        {/* Question Card for direct follow-up questions (after Insurely import) */}
        {currentFollowupQuestion && !pendingQuestion && (
          <div className="mb-4">
            <QuestionCard
              question={{
                field: currentFollowupQuestion.field,
                question: currentFollowupQuestion.question,
                inputType: currentFollowupQuestion.inputType,
                placeholder: currentFollowupQuestion.placeholder,
                unit: currentFollowupQuestion.unit,
                options: [],
                allowCustom: true,
                allowMultiple: false,
              }}
              onAnswer={handleFollowupAnswer}
              onSkip={handleFollowupSkip}
            />
          </div>
        )}
        {/* Fade gradient overlay */}
        <div className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-sidebar to-transparent" />
        {showSuggestions && (
          <div className="relative mb-4">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-4 bg-gradient-to-r from-sidebar to-transparent" />
            <div className="flex gap-2 overflow-x-auto px-4 scrollbar-none">
              {suggestions.map((suggestion) => (
                <SuggestionButton
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={isLoading}
                >
                  {suggestion}
                </SuggestionButton>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-4 bg-gradient-to-l from-sidebar to-transparent" />
          </div>
        )}
        <PromptInput
          onSubmit={handleSubmit}
          accept="image/*"
          multiple
          className="[&_[data-slot=input-group]]:rounded-3xl [&_[data-slot=input-group]]:border [&_[data-slot=input-group]]:border-border/50 [&_[data-slot=input-group]]:bg-background [&_[data-slot=input-group]]:shadow-sm"
        >
          <PromptInputAttachments />
          <PromptInputTextarea
            placeholder="Fråga vad som helst..."
            disabled={isLoading}
            className="min-h-[52px] resize-none border-none bg-transparent px-5 py-4 text-sm outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed"
          />
          <PromptInputFooter className="px-3 py-3">
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger
                  className="relative flex h-10 w-10 items-center justify-center rounded-full bg-muted/50 text-muted-foreground shadow-[0_2px_4px_-1px_rgba(0,0,0,0.06),0_1px_2px_-1px_rgba(0,0,0,0.04)] ring-1 ring-inset ring-border/30 transition-all hover:bg-muted hover:text-foreground hover:shadow-[0_2px_6px_-1px_rgba(0,0,0,0.1)] active:scale-95 [&>svg]:h-5 [&>svg]:w-5"
                  aria-label="Lägg till bilagor"
                />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments label="Lägg till bilder" />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
            </PromptInputTools>
            <PromptInputSubmit
              status={status}
              onStop={stop}
              className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-foreground shadow-[0_2px_4px_-1px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.06)] transition-all hover:bg-foreground/90 hover:shadow-[0_2px_6px_-1px_rgba(0,0,0,0.15)] active:scale-95 disabled:bg-muted disabled:opacity-50 disabled:shadow-none [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-background"
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
