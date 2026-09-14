"use client"

import { useState } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TutorComposerProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function TutorComposer({
  onSend,
  disabled = false,
  placeholder = "Ask tutor about feedback or grammar...",
}: TutorComposerProps) {
  const [input, setInput] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || disabled) return
    onSend(input.trim())
    setInput("")
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-2 border-t border-border">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 h-8 px-3 rounded-[2px] border border-border bg-background text-xs font-serif placeholder:text-muted-foreground focus:outline-hidden focus:border-foreground"
      />
      <Button
        type="submit"
        size="sm"
        disabled={disabled || !input.trim()}
        className="h-8 px-3 text-xs font-mono rounded-[2px]"
      >
        <Send className="size-3 mr-1" /> Send
      </Button>
    </form>
  )
}
