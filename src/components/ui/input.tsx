import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-xl px-3 py-2 text-base md:text-sm",
        "bg-[image:var(--gradient-input-fill)] border-0",
        "shadow-[var(--shadow-input-base)]",
        "transition-all duration-200 outline-none",
        "placeholder:text-muted-foreground/60",
        "hover:shadow-[var(--shadow-input-hover)]",
        "focus-visible:shadow-[var(--shadow-input-focus),var(--glow-input-focus)]",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:shadow-[0_0_0_1px_var(--destructive),0_0_0_4px_oklch(0.62_0.2_25/0.15)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
