import { cn } from "@/lib/utils"

interface SkillLoadingStateProps {
  label: string
  sublabel?: string
  className?: string
}

export function SkillLoadingState({
  label,
  sublabel,
  className,
}: SkillLoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-20 text-center font-mono text-muted-foreground",
        className
      )}
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative size-6 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-border" />
        <div className="absolute inset-0 rounded-full border-t border-foreground animate-loader-orbit" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="text-[11px] tracking-tight text-foreground font-medium">{label}</p>
        {sublabel && <p className="text-[10px] text-muted-foreground">{sublabel}</p>}
        <div className="h-0.5 w-24 overflow-hidden rounded-[1px] bg-muted relative mt-1">
          <div className="absolute inset-0 bg-foreground/70 animate-loader-shimmer" />
        </div>
      </div>
    </div>
  )
}
