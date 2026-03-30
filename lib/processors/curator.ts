import type { Article, CollectedArticle } from '@/lib/types';
import { callClaude } from '@/lib/clients/anthropic';
import { getSupabaseAdmin } from '@/lib/clients/supabase';
import { safeParseJSON } from '@/lib/utils/json-parser';
import { ACRYL_CONTEXT } from '@/lib/prompts/context';
import { CURATION_PROMPT, DEEP_SUMMARY_PROMPT } from '@/lib/prompts/curation';
import { logger } from '@/lib/utils/logger';

interface CurationAnalysis {
  index: number;
  relevance_score: number;
  urgency: 'red' | 'yellow' | 'green';
  category: string;
  content_type: string;
  impact_comment: string;
}

interface DeepAnalysis {
  index: number;
  deep_summary: string;
  source_description: string;
  key_findings: string[];
  action_items: string[];
}

export async function basicCuration(
  articles: CollectedArticle[],
  batchId: string
): Promise<{ articles: Article[]; apiCalls: number; tokensIn: number; tokensOut: number; warnings: string[] }> {
  const warnings: string[] = [];
  let apiCalls = 0;
  let tokensIn = 0;
  let tokensOut = 0;

  // Process in batches of 40
  const batchSize = 40;
  const allAnalyses: CurationAnalysis[] = [];

  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    const batchContent = batch.map((a, idx) => `[${i + idx}] ${a.title}\n출처: ${a.source}\n요약: ${a.summary || '없음'}\nURL: ${a.url}`).join('\n\n');

    try {
      const result = await callClaude({
        model: 'smart',
        system: ACRYL_CONTEXT,
        userMessage: `${CURATION_PROMPT}\n\n${batchContent}`,
        label: `curation-basic-batch-${i}`,
      });
      apiCalls++;
      tokensIn += result.tokensIn;
      tokensOut += result.tokensOut;

      const text = result.message.content[0]?.type === 'text'
        ? (result.message.content[0] as { type: 'text'; text: string }).text
        : '';
      const parsed = safeParseJSON<{ analyses?: CurationAnalysis[] }>(text, { analyses: [] });
      allAnalyses.push(...(parsed.analyses || []));
    } catch (err) {
      warnings.push(`Basic curation batch ${i} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Merge analyses with articles
  const supabase = getSupabaseAdmin();
  const curatedArticles: Article[] = [];

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const analysis = allAnalyses.find((a) => a.index === i);

    const row = {
      title: article.title,
      url: article.url,
      source: article.source,
      content_type: analysis?.content_type || article.content_type,
      published_at: article.published_at,
      summary: article.summary,
      matched_keywords: article.matched_keywords,
      category: analysis?.category || null,
      relevance_score: analysis?.relevance_score || 5,
      urgency: analysis?.urgency || 'green',
      impact_comment: analysis?.impact_comment || null,
      batch_id: batchId,
      key_findings: [],
      action_items: [],
    };

    const { data, error } = await supabase.from('articles').insert(row).select().single();
    if (error) {
      warnings.push(`Insert article failed: ${article.title}`);
      continue;
    }
    curatedArticles.push(data as Article);
  }

  logger.info('curator', `Basic curation: ${curatedArticles.length} articles curated`);
  return { articles: curatedArticles, apiCalls, tokensIn, tokensOut, warnings };
}

export async function deepCuration(
  articles: Article[]
): Promise<{ deepCount: number; apiCalls: number; tokensIn: number; tokensOut: number; warnings: string[] }> {
  const warnings: string[] = [];
  let apiCalls = 0;
  let tokensIn = 0;
  let tokensOut = 0;

  // Only deep-curate red and yellow urgency articles with score >= 7
  const targets = articles.filter(
    (a) => (a.urgency === 'red' || a.urgency === 'yellow') && (a.relevance_score || 0) >= 7
  );

  if (targets.length === 0) return { deepCount: 0, apiCalls, tokensIn, tokensOut, warnings };

  const batchContent = targets.map((a, idx) =>
    `[${idx}] ${a.title}\n출처: ${a.source}\n요약: ${a.summary || '없음'}\nURL: ${a.url}`
  ).join('\n\n');

  try {
    const result = await callClaude({
      model: 'smart',
      system: ACRYL_CONTEXT,
      userMessage: `${DEEP_SUMMARY_PROMPT}\n\n${batchContent}`,
      label: 'curation-deep',
    });
    apiCalls++;
    tokensIn += result.tokensIn;
    tokensOut += result.tokensOut;

    const text = result.message.content[0]?.type === 'text'
      ? (result.message.content[0] as { type: 'text'; text: string }).text
      : '';
    const parsed = safeParseJSON<{ analyses?: DeepAnalysis[] }>(text, { analyses: [] });

    const supabase = getSupabaseAdmin();
    for (const analysis of parsed.analyses || []) {
      const target = targets[analysis.index];
      if (!target) continue;

      await supabase.from('articles').update({
        deep_summary: analysis.deep_summary,
        source_description: analysis.source_description,
        key_findings: analysis.key_findings || [],
        action_items: analysis.action_items || [],
      }).eq('id', target.id);
    }

    logger.info('curator', `Deep curation: ${parsed.analyses?.length || 0} articles analyzed`);
    return { deepCount: parsed.analyses?.length || 0, apiCalls, tokensIn, tokensOut, warnings };
  } catch (err) {
    warnings.push(`Deep curation failed: ${err instanceof Error ? err.message : String(err)}`);
    return { deepCount: 0, apiCalls, tokensIn, tokensOut, warnings };
  }
}
