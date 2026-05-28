"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

export interface SuggestionButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const SuggestionButton = forwardRef<
  HTMLButtonElement,
  SuggestionButtonProps
>(({ className, children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex flex-shrink-0 items-center whitespace-nowrap rounded-full border border-border/60 bg-background px-3 py-1.5",
        "text-xs text-muted-foreground transition-colors",
        "hover:border-border hover:bg-accent hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});

SuggestionButton.displayName = "SuggestionButton";
