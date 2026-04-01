import { collectors } from '@/lib/collectors';
import { dedup } from '@/lib/utils/dedup';
import { scoreArticle } from '@/lib/utils/scorer';
import { getSupabaseAdmin } from '@/lib/clients/supabase';
import { logger } from '@/lib/utils/logger';
import type { CollectedArticle, PipelineMetrics } from '@/lib/types';

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);
}

export async function runCollect(): Promise<{ batchId: string; articlesCount: number; warnings: string[]; metrics: Partial<PipelineMetrics> }> {
  const supabase = getSupabaseAdmin();
  const warnings: string[] = [];

  // Auto-expire stuck pipelines
  await supabase.from('pipeline_runs')
    .update({ status: 'failed', completed_at: new Date().toISOString(), error: 'Auto-expired' })
    .eq('status', 'running')
    .lt('started_at', new Date(Date.now() - 3 * 60000).toISOString());

  // Create run
  const { data: run, error: runErr } = await supabase
    .from('pipeline_runs')
    .insert({ status: 'running' })
    .select().single();
  if (runErr || !run) throw new Error(`Failed: ${runErr?.message}`);
  const batchId = run.batch_id;

  const collectorMetrics: PipelineMetrics['collectors'] = {};

  // Run ALL collectors in parallel with 20s timeout
  let allArticles: CollectedArticle[] = [];
  const results = await Promise.allSettled(
    collectors.map(async (c) => {
      const t = Date.now();
      try {
        const articles = await withTimeout(c.collect(batchId), 20000, []);
        collectorMetrics[c.name] = { count: articles.length, duration_ms: Date.now() - t, errors: [] };
        return articles;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        collectorMetrics[c.name] = { count: 0, duration_ms: Date.now() - t, errors: [msg] };
        warnings.push(`${c.name}: ${msg}`);
        return [] as CollectedArticle[];
      }
    })
  );
  for (const r of results) {
    if (r.status === 'fulfilled') allArticles.push(...r.value);
  }

  // Dedup
  allArticles = await dedup(allArticles);
  logger.info('collect', `${allArticles.length} articles after dedup`);

  // Score + batch insert
  const rows = allArticles.map((a) => {
    const score = scoreArticle(a);
    return {
      title: a.title, url: a.url, source: a.source,
      content_type: a.content_type, published_at: a.published_at,
      summary: a.summary, matched_keywords: a.matched_keywords,
      batch_id: batchId,
      relevance_score: score.relevance_score,
      urgency: score.urgency,
      category: score.category,
      impact_comment: score.impact_comment,
      key_findings: [], action_items: [],
    };
  });

  if (rows.length > 0) {
    const { error: insertErr } = await supabase.from('articles').insert(rows);
    if (insertErr) warnings.push(`Insert: ${insertErr.message}`);
  }

  // Update run
  await supabase.from('pipeline_runs').update({
    status: 'completed', completed_at: new Date().toISOString(),
    articles_count: rows.length,
    metrics: { collectors: collectorMetrics },
  }).eq('id', run.id);

  logger.info('collect', `Done: ${rows.length} articles saved`);
  return { batchId, articlesCount: rows.length, warnings, metrics: { collectors: collectorMetrics } };
}
