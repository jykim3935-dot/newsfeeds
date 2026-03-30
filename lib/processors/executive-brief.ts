import type { Article } from '@/lib/types';
import { callClaude } from '@/lib/clients/anthropic';
import { safeParseJSON } from '@/lib/utils/json-parser';
import { ACRYL_CONTEXT } from '@/lib/prompts/context';
import { EXECUTIVE_BRIEF_PROMPT } from '@/lib/prompts/analysis';
import { logger } from '@/lib/utils/logger';

export async function generateBrief(
  articles: Article[]
): Promise<{ brief: string; tokensIn: number; tokensOut: number; warning?: string }> {
  if (articles.length === 0) {
    return { brief: '오늘 수집된 기사가 없습니다.', tokensIn: 0, tokensOut: 0 };
  }

  const content = articles
    .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
    .map((a, idx) =>
      `[${idx}] [${a.urgency}] ${a.title} (${a.category}, score:${a.relevance_score})\n${a.impact_comment || a.summary || ''}`
    ).join('\n\n');

  try {
    const result = await callClaude({
      model: 'smart',
      system: ACRYL_CONTEXT,
      userMessage: `${EXECUTIVE_BRIEF_PROMPT}\n\n${content}`,
      label: 'executive-brief',
    });

    const text = result.message.content[0]?.type === 'text'
      ? (result.message.content[0] as { type: 'text'; text: string }).text
      : '';
    const parsed = safeParseJSON<{ executive_brief?: string }>(text, { executive_brief: '' });

    logger.info('brief', 'Executive brief generated');
    return {
      brief: parsed.executive_brief || text,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('brief', `Brief generation failed: ${msg}`);
    return { brief: '브리프 생성 중 오류가 발생했습니다.', tokensIn: 0, tokensOut: 0, warning: msg };
  }
}
