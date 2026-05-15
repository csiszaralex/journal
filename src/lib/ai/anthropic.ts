import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/env";

export const QUESTIONS_MODEL = "claude-sonnet-4-6";

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (client) return client;
  client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}
