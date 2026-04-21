import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        // Base
        "h-12 w-full min-w-0 rounded-xl border border-border bg-white px-4 py-0",
        // Typography
        "text-[15px] text-foreground placeholder:text-muted-foreground/50 leading-none",
        // Transitions
        "transition-all duration-200 outline-none",
        // Focus — navy ring + border
        "focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15",
        // File input
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        // Disabled
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-60",
        // Error
        "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15",
        // Dark
        "dark:bg-white/5 dark:border-white/15 dark:focus-visible:border-primary dark:disabled:bg-white/5",
        className
      )}
      {...props}
    />
  )
}

export { Input }
