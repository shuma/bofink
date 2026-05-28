"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMortgageStore } from "@/hooks/use-mortgage-store";
import { useCalculations } from "@/hooks/use-calculations";
import { formatSEK, formatPercent } from "@/lib/formatters";

export function AssumptionGroups() {
  const { boVarde, setBoVarde, inkomst, setInkomst } = useMortgageStore();
  const { ltv, debtRatio, requiredAmortization, weightedRate } =
    useCalculations();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Antaganden & nyckeltal</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion multiple defaultValue={["property", "ratios"]}>
          <AccordionItem value="property">
            <AccordionTrigger className="text-sm">
              Fastighetsvärde & inkomst
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-4 pt-2 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-muted-foreground">
                    Bostadens värde (SEK)
                  </label>
                  <Input
                    type="number"
                    value={boVarde}
                    onChange={(e) => setBoVarde(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">
                    Månadsinkomst brutto (SEK)
                  </label>
                  <Input
                    type="number"
                    value={inkomst}
                    onChange={(e) => setInkomst(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="ratios">
            <AccordionTrigger className="text-sm">Nyckeltal</AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                <KeyRatio
                  label="Belåningsgrad (LTV)"
                  value={formatPercent(ltv)}
                  description="Lån / Bostadens värde"
                  warning={ltv > 85}
                />
                <KeyRatio
                  label="Skuldkvot"
                  value={`${debtRatio.toFixed(1)}x`}
                  description="Lån / Årsinkomst"
                  warning={debtRatio > 4.5}
                />
                <KeyRatio
                  label="Snittränta"
                  value={formatPercent(weightedRate)}
                  description="Viktad genomsnittlig ränta"
                />
                <KeyRatio
                  label="Amorteringskrav"
                  value={`${requiredAmortization}%`}
                  description="Enligt svenska regler"
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="swedish-rules">
            <AccordionTrigger className="text-sm">
              Svenska regler
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pt-2 text-sm text-muted-foreground">
                <p>
                  <strong>Amorteringskrav:</strong>
                </p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>Belåningsgrad &gt; 70%: 2%/år</li>
                  <li>Belåningsgrad 50-70%: 1%/år</li>
                  <li>Skuldkvot &gt; 4,5x: +1%/år</li>
                </ul>
                <p className="pt-2">
                  <strong>Ränteavdrag:</strong> 30% av räntekostnaden är
                  avdragsgill.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

interface KeyRatioProps {
  label: string;
  value: string;
  description: string;
  warning?: boolean;
}

function KeyRatio({ label, value, description, warning }: KeyRatioProps) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`text-lg font-semibold tabular-nums ${
          warning ? "text-orange-500" : ""
        }`}
      >
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{description}</div>
    </div>
  );
}
