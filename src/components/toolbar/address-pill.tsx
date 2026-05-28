"use client";

import { useState } from "react";
import { MapPin, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMortgageStore } from "@/hooks/use-mortgage-store";

export function AddressPill() {
  const { adress, setAdress } = useMortgageStore();
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(adress);

  const handleSave = () => {
    setAdress(tempValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempValue(adress);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" />
        <Input
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-8 w-52 text-sm"
          placeholder="Ange adress..."
          autoFocus
        />
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-primary hover:bg-primary/10"
          onClick={handleSave}
          aria-label="Spara"
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          className="hover:bg-destructive/10 hover:text-destructive"
          onClick={handleCancel}
          aria-label="Avbryt"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  // If no address set, show placeholder state
  if (!adress) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="flex h-8 items-center gap-2 rounded-xl border border-dashed border-border px-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MapPin className="h-3.5 w-3.5" />
        <span>Lägg till adress</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="flex h-8 items-center gap-2 rounded-xl bg-secondary px-3 text-sm font-medium shadow-sm transition-all duration-200 hover:bg-secondary/80 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <MapPin className="h-3.5 w-3.5 text-primary" />
      <span>{adress}</span>
    </button>
  );
}
