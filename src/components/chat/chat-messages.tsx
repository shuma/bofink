"use client";

import { MessageCircle } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { cn } from "@/lib/utils";

const starterPrompts = [
  "Jag har ett bolån på 2,5 miljoner",
  "Hjälp mig förstå mina lånekostnader",
  "Vad kostar räntan varje månad?",
];

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatMessagesProps {
  messages?: ChatMessage[];
  isLoading?: boolean;
  onStarterClick?: (prompt: string) => void;
}

export function ChatMessages({ messages = [], isLoading, onStarterClick }: ChatMessagesProps) {
  if (messages.length === 0) {
    return (
      <ConversationEmptyState className="flex-1 px-5 py-8">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <MessageCircle className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-heading text-base font-medium">
            Hej! Hur kan jag hjälpa dig?
          </h3>
          <p className="mt-2 max-w-[280px] text-sm leading-relaxed text-muted-foreground">
            Berätta om ditt bolån så hjälper jag dig förstå kostnader, jämföra räntor och hitta besparingar.
          </p>
          {onStarterClick && (
            <div className="mt-5 flex flex-col gap-2">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => onStarterClick(prompt)}
                  className="rounded-xl border border-border/60 bg-background px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
        </div>
      </ConversationEmptyState>
    );
  }

  return (
    <Conversation className="flex-1">
      <ConversationContent className="gap-4 px-5 py-4">
        {messages.map((message) => (
          <Message key={message.id} from={message.role}>
            <MessageContent
              className={cn(
                "animate-in fade-in slide-in-from-bottom-1 duration-200",
                message.role === "user"
                  ? "ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground"
                  : "max-w-full text-sm leading-relaxed"
              )}
            >
              {message.role === "assistant" ? (
                <MessageResponse>{message.content}</MessageResponse>
              ) : (
                <span className="whitespace-pre-wrap">{message.content}</span>
              )}
            </MessageContent>
          </Message>
        ))}
        {isLoading && (
          <div className="flex flex-col items-start">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              Tänker...
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30"
                  style={{
                    animation: "blink 1.1s ease infinite",
                    animationDelay: `${i * 0.18}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
