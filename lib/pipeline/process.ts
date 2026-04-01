import { generateBrief } from '@/lib/processors/executive-brief';
import { deepCuration } from '@/lib/processors/curator';
import { detectTrends } from '@/lib/processors/trend-detector';
import { getSupabaseAdmin } from '@/lib/clients/supabase';
import { logger } from '@/lib/utils/logger';
import type { Article, Trend } from '@/lib/types';

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);
}

export async function runProcess(batchId: string): Promise<{
  brief: string;
  deepCuratedCount: number;
  trendsCount: number;
  trends: Trend[];
  tokensIn: number;
  tokensOut: number;
  warnings: string[];
}> {
  const supabase = getSupabaseAdmin();
  const warnings: string[] = [];
  let tokensIn = 0;
  let tokensOut = 0;

  const { data } = await supabase.from('articles').select('*')
    .eq('batch_id', batchId)
    .order('relevance_score', { ascending: false });

  const articles = (data || []) as Article[];
  if (articles.length === 0) {
    return { brief: '', deepCuratedCount: 0, trendsCount: 0, trends: [], tokensIn: 0, tokensOut: 0, warnings: ['No articles found'] };
  }

  // Step 1: Generate brief (with error isolation)
  let brief = '';
  try {
    const briefResult = await withTimeout(
      generateBrief(articles), 25000,
      { brief: '', tokensIn: 0, tokensOut: 0, warning: 'Brief timed out' }
    );
    brief = briefResult.brief;
    tokensIn += briefResult.tokensIn;
    tokensOut += briefResult.tokensOut;
    if (briefResult.warning) warnings.push(briefResult.warning);

    await supabase.from('pipeline_runs')
      .update({ executive_brief: brief || null })
      .eq('batch_id', batchId);
    logger.info('process', `Brief generated for batch ${batchId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    warnings.push(`Brief generation failed: ${msg}`);
    logger.error('process', `Brief failed: ${msg}`);
  }

  // Step 2: Deep curation (with error isolation)
  let deepCuratedCount = 0;
  try {
    const deepResult = await withTimeout(
      deepCuration(articles), 20000,
      { deepCount: 0, apiCalls: 0, tokensIn: 0, tokensOut: 0, warnings: ['Deep curation timed out'] }
    );
    deepCuratedCount = deepResult.deepCount;
    tokensIn += deepResult.tokensIn;
    tokensOut += deepResult.tokensOut;
    warnings.push(...deepResult.warnings);
    logger.info('process', `Deep curation: ${deepCuratedCount} articles`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    warnings.push(`Deep curation failed: ${msg}`);
    logger.error('process', `Deep curation failed: ${msg}`);
  }

  // Step 3: Trend detection (with error isolation)
  let trends: Trend[] = [];
  try {
    const trendResult = await withTimeout(
      detectTrends(articles, batchId), 20000,
      { trends: [] as Trend[], tokensIn: 0, tokensOut: 0, warning: 'Trend detection timed out' }
    );
    trends = trendResult.trends;
    tokensIn += trendResult.tokensIn;
    tokensOut += trendResult.tokensOut;
    if (trendResult.warning) warnings.push(trendResult.warning);
    logger.info('process', `Trends detected: ${trends.length}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    warnings.push(`Trend detection failed: ${msg}`);
    logger.error('process', `Trend detection failed: ${msg}`);
  }

  return { brief, deepCuratedCount, trendsCount: trends.length, trends, tokensIn, tokensOut, warnings };
}
