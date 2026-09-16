"use client"

import { useState } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TutorComposerProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
  initialValue?: string
  inputRef?: React.RefObject<HTMLInputElement | null>
  sendLabel?: string
}

export function TutorComposer({
  onSend,
  disabled = false,
  placeholder = "Ask tutor about feedback or grammar...",
  initialValue = "",
  inputRef,
  sendLabel = "Send",
}: TutorComposerProps) {
  const [input, setInput] = useState(initialValue)
  const [prevInitialValue, setPrevInitialValue] = useState(initialValue)

  if (initialValue !== prevInitialValue) {
    setPrevInitialValue(initialValue)
    setInput(initialValue)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || disabled) return
    const text = input.trim()
    onSend(text)
    setInput("")
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-2 border-t border-border">
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-label="Ask IELTS tutor"
        className="flex-1 min-h-10 h-10 px-3 rounded-[2px] border border-border bg-background text-xs font-serif placeholder:text-muted-foreground focus:outline-hidden focus:border-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
      />
      <Button
        type="submit"
        size="sm"
        disabled={disabled || !input.trim()}
        aria-label="Send message to tutor"
        className="min-h-10 h-10 px-3 text-xs font-mono rounded-[2px] focus-visible:ring-1 focus-visible:ring-ring"
      >
        <Send className="size-3 mr-1" /> {sendLabel}
      </Button>
    </form>
  )
}
