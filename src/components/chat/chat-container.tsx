"use client";

import { useMemo, useEffect, useRef, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMortgageStore, type Years } from "@/hooks/use-mortgage-store";
import { useChatStore } from "@/hooks/use-chat-store";
import { useCalculations } from "@/hooks/use-calculations";
import { useSuggestions } from "@/hooks/use-suggestions";
import { ChatMessages, ChatMessage } from "./chat-messages";
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

export function ChatContainer({ chatId }: ChatContainerProps) {
  const processedToolCalls = useRef<Set<string>>(new Set());
  const { messages: storedMessages, setMessages: setStoredMessages } = useChatStore();

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

  const { messages, sendMessage, status, setMessages, stop } = useChat({
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

  // Only show suggestions when user has entered some mortgage data and suggestions are loaded
  const hasData = loans.length > 0 || boVarde > 0 || inkomst > 0 || adress !== "";
  const showSuggestions = hasData && suggestions.length > 0 && !suggestionsLoading;

  return (
    <div className="flex h-full flex-col">
      <ChatMessages
        messages={formattedMessages}
        isLoading={isLoading}
        onStarterClick={handleSuggestionClick}
      />
      <div className="relative flex-shrink-0 px-5 pb-5 pt-4">
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
        <p className="mt-3 text-center text-[10px] text-muted-foreground/50">
          AI-råd ersätter inte professionell finansiell rådgivning.
        </p>
      </div>
    </div>
  );
}
