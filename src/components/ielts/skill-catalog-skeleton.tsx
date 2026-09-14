import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"

interface SkillCatalogSkeletonProps {
  skillLabel?: string
  count?: number
}

/**
 * Skeleton loading screen matching final SkillTestPanel layout and card rhythm.
 * Uses gentle pulse shimmer, respects prefers-reduced-motion.
 */
export function SkillCatalogSkeleton({
  skillLabel = "Practice",
  count = 6,
}: SkillCatalogSkeletonProps) {
  return (
    <div
      className="flex flex-col gap-6 w-full animate-fade-in motion-reduce:animate-none"
      aria-busy="true"
      aria-label={`Loading ${skillLabel} practice catalog`}
    >
      {/* Header bar placeholder */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-24 rounded-[2px] bg-muted animate-pulse motion-reduce:animate-none" />
            <div className="h-3 w-32 rounded-[2px] bg-muted/60 animate-pulse motion-reduce:animate-none" />
          </div>
          <div className="h-6 w-48 rounded-[2px] bg-muted animate-pulse motion-reduce:animate-none" />
          <div className="h-3.5 w-64 rounded-[2px] bg-muted/60 animate-pulse motion-reduce:animate-none" />
        </div>
        <div className="h-5 w-20 rounded-[2px] bg-muted self-start sm:self-auto animate-pulse motion-reduce:animate-none" />
      </div>

      {/* Grid of skeleton cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <Card
            key={i}
            className="flex flex-col justify-between rounded-[3px] border-border bg-card shadow-none"
          >
            <CardHeader className="pb-3 border-b border-border/60 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="h-3 w-16 rounded-[2px] bg-muted/80 animate-pulse motion-reduce:animate-none" />
                <div className="h-3.5 w-12 rounded-[2px] bg-muted/50 animate-pulse motion-reduce:animate-none" />
              </div>
              <div className="h-4 w-3/4 rounded-[2px] bg-muted animate-pulse motion-reduce:animate-none mt-1" />
              <div className="flex items-center gap-2 pt-1">
                <div className="h-3 w-12 rounded-[2px] bg-muted/70 animate-pulse motion-reduce:animate-none" />
                <div className="h-3 w-16 rounded-[2px] bg-muted/70 animate-pulse motion-reduce:animate-none" />
                <div className="h-3 w-20 rounded-[2px] bg-muted/70 animate-pulse motion-reduce:animate-none" />
              </div>
            </CardHeader>

            <CardContent className="pt-3 pb-2 flex flex-col gap-1.5">
              <div className="h-3 w-full rounded-[2px] bg-muted/60 animate-pulse motion-reduce:animate-none" />
              <div className="h-3 w-4/5 rounded-[2px] bg-muted/60 animate-pulse motion-reduce:animate-none" />
            </CardContent>

            <CardFooter className="pt-2 pb-3 border-t border-border/60 flex items-center justify-between">
              <div className="h-3 w-12 rounded-[2px] bg-muted/50 animate-pulse motion-reduce:animate-none" />
              <div className="h-8 w-24 rounded-[2px] bg-muted animate-pulse motion-reduce:animate-none" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
