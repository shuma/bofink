"use client";

import { Sidebar } from "@/components/ui/sidebar";
import { ChatSection } from "./chat-section";

export function AppSidebar() {
  return (
    <Sidebar collapsible="none" className="border-r-0">
      <ChatSection />
    </Sidebar>
  );
}
