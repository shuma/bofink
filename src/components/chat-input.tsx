"use client";

import { useState } from "react";
import { Plus, Mic, AudioLines, ArrowUp } from "lucide-react";

interface ChatInputProps {
  onSubmit?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({
  onSubmit,
  placeholder = "Hur kan jag hjälpa dig idag?",
  disabled = false,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = () => {
    if (!input.trim() || disabled) return;
    onSubmit?.(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className={`
        relative bg-card rounded-2xl transition-all duration-200
        ${isFocused
          ? "ring-1 ring-border shadow-sm"
          : "ring-1 ring-border/40 hover:ring-border/60"
        }
      `}
    >
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="
          w-full bg-transparent
          px-5 py-4
          text-base text-foreground placeholder:text-muted-foreground/50
          focus:outline-none
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      />

      <div className="flex items-center justify-between px-4 pb-3">
        <button
          type="button"
          className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors"
          aria-label="Lägg till"
          disabled={disabled}
        >
          <Plus className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors"
            aria-label="Röstinmatning"
            disabled={disabled}
          >
            <Mic className="h-5 w-5" />
          </button>
          {input.trim() ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={disabled}
              className="p-2 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
              aria-label="Skicka"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors"
              aria-label="Ljudvågor"
              disabled={disabled}
            >
              <AudioLines className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
