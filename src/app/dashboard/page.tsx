"use client";

import { Suspense } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MainContent } from "@/components/layout/main-content";
import { SidebarInset } from "@/components/ui/sidebar";

function DashboardContent() {
  return (
    <>
      <AppSidebar />
      <SidebarInset className="flex h-svh flex-col overflow-hidden">
        <MainContent />
      </SidebarInset>
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-svh w-full items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
