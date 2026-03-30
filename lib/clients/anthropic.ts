import Anthropic from '@anthropic-ai/sdk';
import type { ModelTier, CallClaudeResult } from '@/lib/types';
import { logger } from '@/lib/utils/logger';

const MODELS: Record<ModelTier, string> = {
  fast: 'claude-haiku-4-5-20251001',
  smart: 'claude-sonnet-4-20250514',
};

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

interface CallClaudeOptions {
  model: ModelTier;
  system?: string;
  userMessage: string;
  maxTokens?: number;
  label: string;
}

export async function callClaude(opts: CallClaudeOptions): Promise<CallClaudeResult> {
  const { model, system, userMessage, maxTokens = 4096, label } = opts;
  const modelId = MODELS[model];
  const start = Date.now();

  const systemParam: Anthropic.Messages.TextBlockParam[] | undefined = system
    ? [{ type: 'text' as const, text: system, cache_control: { type: 'ephemeral' as const } }]
    : undefined;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const message = await getClient().messages.create({
        model: modelId,
        max_tokens: maxTokens,
        system: systemParam,
        messages: [{ role: 'user', content: userMessage }],
      });

      const result: CallClaudeResult = {
        message,
        tokensIn: message.usage.input_tokens,
        tokensOut: message.usage.output_tokens,
        durationMs: Date.now() - start,
        model: modelId,
      };

      logger.info('callClaude', `${label} completed`, {
        model: modelId, tokensIn: result.tokensIn, tokensOut: result.tokensOut, durationMs: result.durationMs,
      });
      return result;
    } catch (err) {
      lastError = err as Error;
      const status = (err as { status?: number }).status;
      if (status === 429 || status === 529) {
        const wait = Math.pow(2, attempt + 1) * 1000;
        logger.warn('callClaude', `Rate limited (${label}), retry in ${wait}ms`, { attempt });
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}
