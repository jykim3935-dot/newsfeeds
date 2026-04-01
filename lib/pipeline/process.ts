import { generateBrief } from '@/lib/processors/executive-brief';
import { getSupabaseAdmin } from '@/lib/clients/supabase';
import { logger } from '@/lib/utils/logger';
import type { Article } from '@/lib/types';

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);
}

export async function runProcess(batchId: string): Promise<{ brief: string; warnings: string[] }> {
  const supabase = getSupabaseAdmin();
  const warnings: string[] = [];

  const { data } = await supabase.from('articles').select('*')
    .eq('batch_id', batchId)
    .order('relevance_score', { ascending: false });

  const articles = (data || []) as Article[];
  if (articles.length === 0) return { brief: '', warnings: ['No articles found'] };

  // Generate brief with timeout
  const briefResult = await withTimeout(
    generateBrief(articles), 25000,
    { brief: '', tokensIn: 0, tokensOut: 0, warning: 'Brief timed out' }
  );

  if (briefResult.warning) warnings.push(briefResult.warning);

  // Save brief to pipeline run
  await supabase.from('pipeline_runs')
    .update({ executive_brief: briefResult.brief || null })
    .eq('batch_id', batchId);

  logger.info('process', `Brief generated for batch ${batchId}`);
  return { brief: briefResult.brief, warnings };
}
