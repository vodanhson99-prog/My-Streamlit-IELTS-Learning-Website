"use client"

import { useState } from "react"
import { MessageSquare, Sparkles, Loader2, AlertCircle, HelpCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function ExplainView() {
  const [question, setQuestion] = useState("")
  const [userAnswer, setUserAnswer] = useState("")
  const [correctAnswer, setCorrectAnswer] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || !correctAnswer.trim()) return

    setIsLoading(true)
    setErrorMsg(null)

    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          user_answer: userAnswer,
          correct_answer: correctAnswer,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate explanation")
      }

      setExplanation(data.explanation)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error querying Explain Bot")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePreloadExample = () => {
    setQuestion("According to the passage, why might urban bees be healthier than rural bees?")
    setUserAnswer("Cities have fewer flowering plants")
    setCorrectAnswer("Cities often have lower pesticide use and more plant diversity")
    setExplanation(null)
    setErrorMsg(null)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-mono rounded-[2px] border-border">
              Review · Diagnostic Query
            </Badge>
            <span className="text-[11px] font-mono text-muted-foreground">Reading and listening error analysis</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight mt-1">Explain Bot</h1>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handlePreloadExample}
          className="h-7 text-[11px] font-mono rounded-[2px] border-border"
        >
          <HelpCircle className="size-3 mr-1.5" />
          Load sample question
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Form Input */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 flex flex-col gap-4">
          <Card className="rounded-[3px] border-border shadow-none">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-[13px] font-medium">Question parameters</CardTitle>
              <CardDescription className="text-[11px]">
                Input prompt and answer keys to generate comparative analysis.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="explain-q" className="text-[10px] font-mono uppercase text-muted-foreground">
                  Question stem
                </Label>
                <Textarea
                  id="explain-q"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Paste question stem and relevant options here..."
                  className="min-h-30 text-[12px] rounded-[2px] border-border"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="user-ans" className="text-[10px] font-mono uppercase text-muted-foreground">
                    Selected choice (Optional)
                  </Label>
                  <Input
                    id="user-ans"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Option chosen"
                    className="h-8 text-[11px] font-mono rounded-[2px] border-border"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="correct-ans" className="text-[10px] font-mono uppercase text-muted-foreground">
                    Correct key / answer
                  </Label>
                  <Input
                    id="correct-ans"
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    placeholder="Correct answer key"
                    className="h-8 text-[11px] font-mono rounded-[2px] border-border"
                    required
                  />
                </div>
              </div>

              {errorMsg && (
                <Alert variant="destructive" className="rounded-[2px] border-border">
                  <AlertCircle className="size-3.5" />
                  <AlertTitle className="text-[11px] font-mono font-medium">Request failed</AlertTitle>
                  <AlertDescription className="text-[11px] font-mono mt-0.5">
                    {errorMsg}. Verify server API credentials in .env.local if live AI is required.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="border-t border-border pt-3">
              <Button
                type="submit"
                disabled={isLoading || !question.trim() || !correctAnswer.trim()}
                className="h-8 rounded-[2px] text-[11px] font-medium ml-auto"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-3 mr-1.5 animate-spin" />
                    Generating rationale…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3 mr-1.5" />
                    Query rationale
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>

        {/* Output */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <Card className="min-h-105 flex flex-col rounded-[3px] border-border shadow-none">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-[13px] font-medium">Rationale output</CardTitle>
              <CardDescription className="text-[11px]">
                Deconstruction of distractor trap and evidence matching.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 flex-1">
              {isLoading ? (
                <div
                  className="flex flex-col gap-3 py-6"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                    <div className="relative size-3.5 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border border-border" />
                      <div className="absolute inset-0 rounded-full border-t border-foreground animate-loader-orbit" />
                    </div>
                    <span>Analyzing distractor patterns with AI tutor…</span>
                  </div>
                  <div className="relative overflow-hidden h-3 bg-muted/60 rounded-[2px] w-3/4">
                    <div className="absolute inset-0 bg-foreground/10 animate-loader-shimmer" />
                  </div>
                  <div className="relative overflow-hidden h-3 bg-muted/60 rounded-[2px] w-full">
                    <div className="absolute inset-0 bg-foreground/10 animate-loader-shimmer" />
                  </div>
                  <div className="relative overflow-hidden h-3 bg-muted/60 rounded-[2px] w-5/6">
                    <div className="absolute inset-0 bg-foreground/10 animate-loader-shimmer" />
                  </div>
                  <div className="relative overflow-hidden h-3 bg-muted/60 rounded-[2px] w-2/3">
                    <div className="absolute inset-0 bg-foreground/10 animate-loader-shimmer" />
                  </div>
                </div>
              ) : explanation ? (
                <div className="text-[12px] leading-relaxed whitespace-pre-wrap font-sans text-foreground">
                  {explanation}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <div className="size-8 rounded-[2px] bg-muted flex items-center justify-center mb-2">
                    <MessageSquare className="size-4" />
                  </div>
                  <p className="text-[12px] font-medium text-foreground">No active query</p>
                  <p className="text-[11px] max-w-xs mt-1 text-muted-foreground">
                    Submit question and answer parameters to inspect the distractor trap and passage evidence.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
