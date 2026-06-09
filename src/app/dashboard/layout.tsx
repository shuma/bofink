"use client";

import { SidebarProvider } from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider
      defaultOpen={true}
      className="h-svh"
      style={{
        "--sidebar-width": "400px",
        "--sidebar-width-mobile": "320px",
      } as React.CSSProperties}
    >
      {children}
    </SidebarProvider>
  );
}
