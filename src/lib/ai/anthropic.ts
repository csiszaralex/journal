import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/env";

export const QUESTIONS_MODEL = "claude-haiku-4-5-20251001";

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (client) return client;
  client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}
