import type { Article, Trend } from '@/lib/types';
import { callClaude } from '@/lib/clients/anthropic';
import { getSupabaseAdmin } from '@/lib/clients/supabase';
import { safeParseJSON } from '@/lib/utils/json-parser';
import { ACRYL_CONTEXT } from '@/lib/prompts/context';
import { TREND_DETECTION_PROMPT } from '@/lib/prompts/analysis';
import { logger } from '@/lib/utils/logger';

interface DetectedTrend {
  trend_title: string;
  trend_description: string;
  related_indices: number[];
  category: string;
  strength: 'rising' | 'stable' | 'emerging';
}

export async function detectTrends(
  articles: Article[],
  batchId: string
): Promise<{ trends: Trend[]; tokensIn: number; tokensOut: number; warning?: string }> {
  if (articles.length === 0) {
    return { trends: [], tokensIn: 0, tokensOut: 0 };
  }

  const content = articles.map((a, idx) =>
    `[${idx}] [${a.urgency}] ${a.title} (${a.category}, score:${a.relevance_score})\n${a.summary || ''}`
  ).join('\n\n');

  try {
    const result = await callClaude({
      model: 'smart',
      system: ACRYL_CONTEXT,
      userMessage: `${TREND_DETECTION_PROMPT}\n\n${content}`,
      label: 'trend-detection',
    });

    const text = result.message.content[0]?.type === 'text'
      ? (result.message.content[0] as { type: 'text'; text: string }).text
      : '';
    const parsed = safeParseJSON<{ trends?: DetectedTrend[] }>(text, { trends: [] });

    const supabase = getSupabaseAdmin();
    const trends: Trend[] = [];

    for (const t of parsed.trends || []) {
      const relatedIds = t.related_indices
        .map((idx) => articles[idx]?.id)
        .filter(Boolean) as string[];

      const { data, error } = await supabase.from('trends').insert({
        batch_id: batchId,
        trend_title: t.trend_title,
        trend_description: t.trend_description,
        related_article_ids: relatedIds,
        category: t.category,
        strength: t.strength,
      }).select().single();

      if (!error && data) trends.push(data as Trend);
    }

    logger.info('trends', `Detected ${trends.length} trends`);
    return { trends, tokensIn: result.tokensIn, tokensOut: result.tokensOut };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('trends', `Trend detection failed: ${msg}`);
    return { trends: [], tokensIn: 0, tokensOut: 0, warning: msg };
  }
}
