"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UIMessage } from "ai";

interface ChatState {
  // Chat messages
  messages: UIMessage[];

  // Actions
  setMessages: (messages: UIMessage[]) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],

      setMessages: (messages) => set({ messages }),

      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: "bolaneplaner-chat-storage",
    }
  )
);
