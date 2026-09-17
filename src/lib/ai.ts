import type { AIMessage } from "./ai/contracts"
import { createEnvironmentGroqProvider } from "./ai/provider"

export type GroqMessage = AIMessage

export async function requestGroq(
  messages: GroqMessage[],
  maxTokens: number,
  temperature: number,
): Promise<string> {
  const result = await createEnvironmentGroqProvider().complete({ messages, maxTokens, temperature })
  return result.text
}
