"use client";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { MainContent } from "@/components/layout/main-content";
import { SidebarInset } from "@/components/ui/sidebar";

export default function Home() {
  return (
    <>
      <AppSidebar />
      <SidebarInset className="flex-1 h-svh overflow-y-auto">
        <MainContent />
      </SidebarInset>
    </>
  );
}
