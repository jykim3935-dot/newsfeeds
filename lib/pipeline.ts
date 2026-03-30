import { collectors } from '@/lib/collectors';
import { generateBrief } from '@/lib/processors/executive-brief';
import { renderNewsletter } from '@/lib/renderers/newsletter';
import { generateSubjectLine } from '@/lib/renderers/subject-line';
import { dedup } from '@/lib/utils/dedup';
import { scoreArticle } from '@/lib/utils/scorer';
import { sendEmail } from '@/lib/clients/resend';
import { getSupabaseAdmin } from '@/lib/clients/supabase';
import { logger } from '@/lib/utils/logger';
import type { PipelineResult, PipelineMetrics, CollectedArticle, Article, Trend } from '@/lib/types';

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

const TIMEOUT = { COLLECT: 20000, BRIEF: 10000 } as const;

export async function runPipeline(testEmail?: string): Promise<PipelineResult> {
  const start = Date.now();
  const supabase = getSupabaseAdmin();

  // Auto-expire stuck pipelines
  const expireCutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  await supabase.from('pipeline_runs')
    .update({ status: 'failed', completed_at: new Date().toISOString(), error: 'Auto-expired' })
    .eq('status', 'running')
    .lt('started_at', expireCutoff);

  // Create pipeline run
  const { data: run, error: runError } = await supabase
    .from('pipeline_runs')
    .insert({ status: 'running' })
    .select()
    .single();

  if (runError || !run) throw new Error(`Failed to create pipeline run: ${runError?.message || 'unknown'}`);

  const batchId = run.batch_id;
  const warnings: string[] = [];
  const metrics: PipelineMetrics = {
    duration_ms: 0,
    collectors: {},
    curation: { basic: { processed: 0, api_calls: 0 }, deep: { processed: 0, api_calls: 0 } },
    tokens: { input_total: 0, output_total: 0 },
    estimated_cost_usd: 0,
    sending: { total: 0, sent: 0, failed: 0 },
  };

  try {
    // === Step 1: Collect (parallel, 20s total) ===
    logger.info('pipeline', 'Step 1: Collect');
    let allArticles: CollectedArticle[] = [];

    const collectResults = await withTimeout(
      Promise.allSettled(
        collectors.map(async (c) => {
          const t = Date.now();
          try {
            const articles = await withTimeout(c.collect(batchId), TIMEOUT.COLLECT, []);
            metrics.collectors[c.name] = { count: articles.length, duration_ms: Date.now() - t, errors: [] };
            return articles;
          } catch (err) {
            metrics.collectors[c.name] = { count: 0, duration_ms: Date.now() - t, errors: [String(err)] };
            return [] as CollectedArticle[];
          }
        })
      ),
      TIMEOUT.COLLECT + 2000,
      []
    );

    if (Array.isArray(collectResults)) {
      for (const r of collectResults) {
        if (r.status === 'fulfilled') allArticles.push(...r.value);
      }
    }

    // === Step 2: Dedup ===
    allArticles = await dedup(allArticles);
    logger.info('pipeline', `Step 2: ${allArticles.length} articles after dedup`);

    // === Step 3: Score + Batch Insert ===
    logger.info('pipeline', 'Step 3: Score + Save');
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

    // Batch insert (한 번에 전부)
    if (rows.length > 0) {
      const { error: insertErr } = await supabase.from('articles').insert(rows);
      if (insertErr) warnings.push(`Insert failed: ${insertErr.message}`);
    }

    // Reload
    const { data: finalArticles } = await supabase
      .from('articles').select('*').eq('batch_id', batchId)
      .order('relevance_score', { ascending: false });
    const articles = (finalArticles || []) as Article[];
    metrics.curation.basic.processed = articles.length;

    // === Step 4: Brief (10s timeout) ===
    logger.info('pipeline', 'Step 4: Brief');
    const briefResult = await withTimeout(
      generateBrief(articles),
      TIMEOUT.BRIEF,
      { brief: '', tokensIn: 0, tokensOut: 0, warning: 'Brief timed out' }
    );
    const brief = briefResult.brief;
    metrics.tokens.input_total += briefResult.tokensIn;
    metrics.tokens.output_total += briefResult.tokensOut;
    if (briefResult.warning) warnings.push(briefResult.warning);

    // === Step 5: Render + Send ===
    logger.info('pipeline', 'Step 5: Send');
    const date = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    });
    const { subject, preheader } = generateSubjectLine(articles, date);
    const html = renderNewsletter({
      articles, date, executiveBrief: brief,
      trends: [] as Trend[], subjectLine: subject, preheaderText: preheader,
    });

    let recipients: string[];
    if (testEmail) {
      recipients = [testEmail];
    } else {
      const { data: rd } = await supabase.from('recipients').select('email').eq('enabled', true);
      recipients = (rd || []).map((r) => r.email);
    }
    metrics.sending.total = recipients.length;
    if (recipients.length > 0) {
      const r = await sendEmail({ to: recipients, subject, html });
      if (r.success) metrics.sending.sent = recipients.length;
      else { metrics.sending.failed = recipients.length; warnings.push(`Email: ${r.error}`); }
    }

    // === Done ===
    metrics.duration_ms = Date.now() - start;
    await supabase.from('pipeline_runs').update({
      status: 'completed', completed_at: new Date().toISOString(),
      articles_count: articles.length, executive_brief: brief || null,
      metrics,
    }).eq('id', run.id);

    logger.info('pipeline', `Done: ${articles.length} articles in ${metrics.duration_ms}ms`);
    return {
      batchId, articlesCount: articles.length, deepCuratedCount: 0,
      trendsCount: 0, sent: metrics.sending.sent,
      errors: [], warnings, status: 'completed', metrics,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await supabase.from('pipeline_runs').update({
      status: 'failed', completed_at: new Date().toISOString(),
      error: msg, metrics: { ...metrics, duration_ms: Date.now() - start },
    }).eq('id', run.id);
    return {
      batchId, articlesCount: 0, deepCuratedCount: 0, trendsCount: 0, sent: 0,
      errors: [msg], warnings, status: 'failed',
      metrics: { ...metrics, duration_ms: Date.now() - start },
    };
  }
}
