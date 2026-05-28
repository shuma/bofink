"use client";

import { useCalculations } from "@/hooks/use-calculations";
import { formatSEK } from "@/lib/formatters";

export function CostsCard() {
  const { monthlyInterestGross, monthlyInterestNet, monthlyAmortization, monthlyNetTotal } = useCalculations();

  const rows = [
    { label: "Ränta (brutto)", value: formatSEK(monthlyInterestGross), color: "text-red-600" },
    { label: "Ränta (efter avdrag)", value: formatSEK(monthlyInterestNet), color: "text-green-600" },
    { label: "Amortering", value: formatSEK(monthlyAmortization), color: "" },
    { label: "Totalt", value: formatSEK(monthlyNetTotal), color: "", bold: true },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-3.5">
        <span className="text-[13px] font-semibold">Kostnader / mån</span>
      </div>

      {/* Cost rows */}
      <div className="space-y-0">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={`flex items-center justify-between py-1.5 ${i < rows.length - 1 ? "border-b" : ""}`}
          >
            <span className={`text-[13px] ${row.bold ? "font-semibold" : "text-muted-foreground"}`}>
              {row.label}
            </span>
            <span className={`text-[13px] ${row.bold ? "font-bold" : "font-medium"} ${row.color}`}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
