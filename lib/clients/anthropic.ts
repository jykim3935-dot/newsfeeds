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
  webSearch?: boolean; // Claude web_search 도구 사용
  label: string;
}

export async function callClaude(opts: CallClaudeOptions): Promise<CallClaudeResult> {
  const { model, system, userMessage, maxTokens = 4096, webSearch, label } = opts;
  const modelId = MODELS[model];
  const start = Date.now();

  // web_search는 SDK가 미지원 → raw API 호출
  if (webSearch) {
    return callClaudeWithWebSearch(modelId, system, userMessage, maxTokens, label, start);
  }

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

async function callClaudeWithWebSearch(
  modelId: string, system: string | undefined, userMessage: string,
  maxTokens: number, label: string, start: number
): Promise<CallClaudeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const body: Record<string, unknown> = {
    model: modelId,
    max_tokens: maxTokens,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
    messages: [{ role: 'user', content: userMessage }],
  };
  if (system) body.system = system;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API ${res.status}: ${errText}`);
  }

  const data = await res.json();

  let text = '';
  for (const block of data.content || []) {
    if (block.type === 'text') text += block.text;
  }

  const tokensIn = data.usage?.input_tokens || 0;
  const tokensOut = data.usage?.output_tokens || 0;

  logger.info('callClaude', `${label} (web_search) completed`, {
    model: modelId, tokensIn, tokensOut, durationMs: Date.now() - start,
  });

  return {
    message: { ...data, content: [{ type: 'text', text }] } as Anthropic.Message,
    tokensIn,
    tokensOut,
    durationMs: Date.now() - start,
    model: modelId,
  };
}
