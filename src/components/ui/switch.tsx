"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "@/lib/utils"

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "group/switch peer relative inline-flex h-5 w-8 shrink-0 cursor-pointer items-center rounded-[10px]",
        "bg-[image:var(--_switch-gradient-track-off)]",
        "shadow-[var(--_switch-shadow-track)]",
        "transition-all duration-200 ease-out",
        "hover:shadow-[var(--_switch-shadow-track-hover)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[checked]:bg-[image:var(--_switch-gradient-track-on)]",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-4 rounded-lg",
          "bg-[image:var(--_switch-gradient-thumb)]",
          "shadow-[var(--_switch-shadow-thumb)]",
          "transition-transform duration-200 ease-out",
          "translate-x-0.5 group-data-[checked]/switch:translate-x-[14px]"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
