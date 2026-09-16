import type { TutorMessage } from "@/lib/ielts-tutor/contracts"
import { Bot, User, Bookmark, ArrowRight } from "lucide-react"

interface TutorMessageItemProps {
  message: TutorMessage
  onSelectFollowUp?: (text: string) => void
  suggestedFollowUpsLabel?: string
}

export function TutorMessageItem({ message, onSelectFollowUp, suggestedFollowUpsLabel = "References" }: TutorMessageItemProps) {
  const isUser = message.role === "user"

  return (
    <div
      className={`flex items-start gap-2.5 p-3 rounded-[2px] text-xs leading-relaxed ${
        isUser
          ? "bg-muted/40 ml-4 border border-border"
          : "bg-background mr-4 border border-border/80 shadow-xs"
      }`}
    >
      <div className="size-5 rounded-[2px] bg-muted flex items-center justify-center shrink-0 mt-0.5">
        {isUser ? <User className="size-3 text-muted-foreground" /> : <Bot className="size-3 text-foreground" />}
      </div>
      <div className="flex-1 space-y-2">
        <div className="whitespace-pre-wrap">{message.content}</div>

        {/* References */}
        {message.references && message.references.length > 0 && (
          <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground space-y-1">
            <span className="font-semibold text-foreground flex items-center gap-1">
              <Bookmark className="size-3" /> References
            </span>
            <ul className="list-disc pl-4 space-y-0.5 font-mono">
              {message.references.map((ref, idx) => (
                <li key={idx}>{ref}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggested follow-ups */}
        {message.suggestedFollowUps && message.suggestedFollowUps.length > 0 && (
          <div className="pt-2 flex flex-wrap gap-1.5">
            {message.suggestedFollowUps.map((followUp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectFollowUp?.(followUp)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-[2px] bg-muted/60 hover:bg-muted text-[11px] text-foreground border border-border transition-colors text-left"
              >
                <span>{followUp}</span>
                <ArrowRight className="size-2.5 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
