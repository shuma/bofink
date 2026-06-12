"use client";

import { cn } from "@/lib/utils";
import type { InsurelyCompany } from "@/types/insurely";

interface BankSelectorProps {
  companies: InsurelyCompany[];
  onSelect: (company: InsurelyCompany) => void;
}

// Bank logo/color mapping
const BANK_STYLES: Record<string, { bg: string; text: string; abbr: string }> = {
  "se-sbab": { bg: "bg-emerald-500", text: "text-white", abbr: "SB" },
  "se-nordea": { bg: "bg-blue-600", text: "text-white", abbr: "NO" },
  "se-seb": { bg: "bg-green-600", text: "text-white", abbr: "SEB" },
  "se-swedbank": { bg: "bg-orange-500", text: "text-white", abbr: "SW" },
  "se-handelsbanken": { bg: "bg-blue-800", text: "text-white", abbr: "SHB" },
  "se-lansforsakringar": { bg: "bg-red-600", text: "text-white", abbr: "LF" },
  "se-ikanobanken": { bg: "bg-purple-600", text: "text-white", abbr: "IK" },
  "se-skandia": { bg: "bg-cyan-600", text: "text-white", abbr: "SK" },
};

export function BankSelector({ companies, onSelect }: BankSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {companies.map((company) => {
        const style = BANK_STYLES[company.id] || {
          bg: "bg-gray-500",
          text: "text-white",
          abbr: company.displayName.slice(0, 2).toUpperCase(),
        };

        return (
          <button
            key={company.id}
            type="button"
            onClick={() => onSelect(company)}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl",
              "bg-secondary/50 hover:bg-secondary/80",
              "transition-colors cursor-pointer",
              "text-left"
            )}
          >
            {/* Bank logo/abbr */}
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                "text-sm font-bold",
                style.bg,
                style.text
              )}
            >
              {style.abbr}
            </div>

            {/* Bank name */}
            <span className="text-[14px] font-medium text-foreground">
              {company.displayName}
            </span>
          </button>
        );
      })}
    </div>
  );
}
