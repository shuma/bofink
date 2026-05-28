"use client";

import { useMemo } from "react";
import { useMortgageStore } from "./use-mortgage-store";

export function useSuggestions() {
  const { loans, boVarde, inkomst, adress } = useMortgageStore();

  const suggestions = useMemo(() => {
    const result: string[] = [];

    // Priority-based suggestions for missing data
    if (!boVarde) result.push("Ange bostadens värde");
    if (!adress) result.push("Ange adressen");
    if (loans.length === 0) result.push("Lägg till ett lån");
    if (loans.length > 0 && !inkomst) result.push("Ange din månadsinkomst");

    // Secondary suggestions when basics are set
    if (boVarde && loans.length > 0) {
      result.push("Beräkna månadskostnad");
      result.push("Visa amorteringsplan");
    }
    if (loans.length > 1) {
      result.push("Jämför räntor");
    }
    if (boVarde && loans.length > 0 && inkomst) {
      result.push("Optimera amortering");
    }

    return result.slice(0, 4); // Max 4 suggestions
  }, [loans, boVarde, inkomst, adress]);

  return { suggestions, isLoading: false };
}
