import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-[2px] border border-input bg-transparent px-2.5 py-2 text-[12px] font-sans transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:ring-1 focus-visible:ring-foreground disabled:cursor-not-allowed disabled:bg-muted/40 disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
