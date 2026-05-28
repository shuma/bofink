"use client";

import { Plus } from "lucide-react";
import { useMortgageStore } from "@/hooks/use-mortgage-store";
import { useCalculations } from "@/hooks/use-calculations";
import { formatSEK } from "@/lib/formatters";
import { GaugeChart } from "@/components/charts/gauge-chart";

export function PropertyCard() {
  const { boVarde, setBoVarde } = useMortgageStore();
  const { totalDebt, ltv } = useCalculations();

  return (
    <div>
      {/* Header */}
      <div className="mb-3.5 flex items-center justify-between">
        <span className="text-[13px] font-semibold">Fastighet</span>
        <button className="flex h-5 w-5 items-center justify-center rounded border bg-background">
          <Plus className="h-2.5 w-2.5 text-muted-foreground" />
        </button>
      </div>

      {/* Värde */}
      <div className="flex items-center justify-between border-b py-1.5">
        <span className="text-[13px] text-muted-foreground">Värde</span>
        <input
          type="text"
          value={formatSEK(boVarde)}
          onChange={(e) => {
            const val = parseFloat(e.target.value.replace(/\s/g, "").replace(",", ".")) || 0;
            setBoVarde(val);
          }}
          className="w-24 border-none bg-transparent text-right text-[13px] font-medium outline-none"
        />
      </div>

      {/* Total skuld */}
      <div className="flex items-center justify-between border-b py-1.5">
        <span className="text-[13px] text-muted-foreground">Total skuld</span>
        <span className="text-[13px] font-medium">{formatSEK(totalDebt)}</span>
      </div>

      {/* Belåningsgrad gauge */}
      <div className="pt-2.5">
        <span className="mb-1 block text-[11px] text-muted-foreground">Belåningsgrad</span>
        <GaugeChart value={ltv} />
      </div>
    </div>
  );
}
