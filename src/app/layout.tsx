import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono, Inter, Figtree } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import "./globals.css";
import { cn } from "@/lib/utils";

const figtreeHeading = Figtree({subsets:['latin'],variable:'--font-heading'});

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const jetbrainsMono = JetBrains_Mono({subsets:['latin'],variable:'--font-mono'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bolåneplaner - Svensk Bolåneplanering",
  description: "Planera ditt bolån med AI-driven rådgivning",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sv"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, jetbrainsMono.variable, "font-sans", inter.variable, figtreeHeading.variable)}
    >
      <body className="h-full">
        <TooltipProvider delay={0}>
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
        </TooltipProvider>
      </body>
    </html>
  );
}
