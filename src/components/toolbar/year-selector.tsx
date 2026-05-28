"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useMortgageStore, Years } from "@/hooks/use-mortgage-store";

const yearOptions: Years[] = [10, 20, 30];

export function YearSelector() {
  const { years, setYears } = useMortgageStore();

  const handleValueChange = (value: string[]) => {
    if (value.length > 0) {
      setYears(Number(value[0]) as Years);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Prognos</span>
      <ToggleGroup
        value={[String(years)]}
        onValueChange={handleValueChange}
        className="h-7"
      >
        {yearOptions.map((y) => (
          <ToggleGroupItem
            key={y}
            value={String(y)}
            className="h-7 px-2 text-xs data-[pressed]:bg-primary data-[pressed]:text-primary-foreground"
          >
            {y} år
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
