import type { TutorMessage } from "@/lib/ielts-tutor/contracts"
import { Bot, User } from "lucide-react"

interface TutorMessageItemProps {
  message: TutorMessage
}

export function TutorMessageItem({ message }: TutorMessageItemProps) {
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
      <div className="flex-1 whitespace-pre-wrap">{message.content}</div>
    </div>
  )
}
