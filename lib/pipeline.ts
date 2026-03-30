import { collectors } from '@/lib/collectors';
import { basicCuration } from '@/lib/processors/curator';
import { detectTrends } from '@/lib/processors/trend-detector';
import { generateBrief } from '@/lib/processors/executive-brief';
import { renderNewsletter } from '@/lib/renderers/newsletter';
import { generateSubjectLine } from '@/lib/renderers/subject-line';
import { dedup } from '@/lib/utils/dedup';
import { sendEmail } from '@/lib/clients/resend';
import { getSupabaseAdmin } from '@/lib/clients/supabase';
import { logger } from '@/lib/utils/logger';
import { scoreArticle } from '@/lib/utils/scorer';
import type { PipelineResult, PipelineMetrics, CollectedArticle, Article, Trend } from '@/lib/types';

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

// Vercel Hobby: 60s 제한. 각 단계별 시간 예산.
const TIMEOUT = {
  RSS: 25000,
  OTHER_COLLECTORS: 15000,
  CURATION: 15000,
  BRIEF: 12000,
  TRENDS: 12000,
  TOTAL_BUDGET: 50000,
} as const;

export async function runPipeline(testEmail?: string): Promise<PipelineResult> {
  const start = Date.now();
  const supabase = getSupabaseAdmin();

  // Check for running pipeline
  const { data: running } = await supabase
    .from('pipeline_runs')
    .select('id')
    .eq('status', 'running')
    .limit(1);

  if (running && running.length > 0) {
    throw new Error('Pipeline already running');
  }

  // Create pipeline run
  const { data: run, error: runError } = await supabase
    .from('pipeline_runs')
    .insert({ status: 'running' })
    .select()
    .single();

  if (runError || !run) throw new Error(`Failed to create pipeline run: ${runError?.message || 'no data returned'}`);

  const batchId = run.batch_id;
  const errors: string[] = [];
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
    // Step 1: Collection — RSS first (parallel, 20s timeout each)
    logger.info('pipeline', 'Step 1: Collection (parallel)');
    let allArticles: CollectedArticle[] = [];

    const rssCollector = collectors.find((c) => c.name === 'rss');
    const otherCollectors = collectors.filter((c) => c.name !== 'rss');

    // RSS is fast — run with 25s timeout
    if (rssCollector) {
      const cStart = Date.now();
      try {
        const articles = await withTimeout(rssCollector.collect(batchId), TIMEOUT.RSS, []);
        allArticles.push(...articles);
        metrics.collectors.rss = { count: articles.length, duration_ms: Date.now() - cStart, errors: [] };
        logger.info('pipeline', `RSS: ${articles.length} articles`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        metrics.collectors.rss = { count: 0, duration_ms: Date.now() - cStart, errors: [msg] };
        warnings.push(`RSS failed: ${msg}`);
      }
    }

    // Other collectors (websearch, gov, research, dart) — parallel, 15s timeout
    const remaining = TIMEOUT.TOTAL_BUDGET - (Date.now() - start);
    if (remaining > TIMEOUT.OTHER_COLLECTORS) {
      const results = await Promise.allSettled(
        otherCollectors.map(async (collector) => {
          const cStart = Date.now();
          try {
            const articles = await withTimeout(collector.collect(batchId), TIMEOUT.OTHER_COLLECTORS, []);
            metrics.collectors[collector.name] = { count: articles.length, duration_ms: Date.now() - cStart, errors: [] };
            return articles;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            metrics.collectors[collector.name] = { count: 0, duration_ms: Date.now() - cStart, errors: [msg] };
            warnings.push(`${collector.name} failed: ${msg}`);
            return [] as CollectedArticle[];
          }
        })
      );
      for (const r of results) {
        if (r.status === 'fulfilled') allArticles.push(...r.value);
      }
    } else {
      warnings.push('Skipped non-RSS collectors (time budget exceeded)');
    }

    // Step 2: Dedup
    logger.info('pipeline', `Step 2: Dedup (${allArticles.length} articles)`);
    try {
      allArticles = await dedup(allArticles);
    } catch (err) {
      warnings.push(`Dedup failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Step 3: Basic Curation (15s timeout)
    logger.info('pipeline', `Step 3: Basic Curation (${allArticles.length} articles)`);
    let curatedArticles: Article[] = [];
    try {
      const curationResult = await withTimeout(
        basicCuration(allArticles, batchId),
        TIMEOUT.CURATION,
        { articles: [], apiCalls: 0, tokensIn: 0, tokensOut: 0, warnings: ['Curation timed out'] }
      );
      curatedArticles = curationResult.articles;
      metrics.curation.basic = { processed: curatedArticles.length, api_calls: curationResult.apiCalls };
      metrics.tokens.input_total += curationResult.tokensIn;
      metrics.tokens.output_total += curationResult.tokensOut;
      warnings.push(...curationResult.warnings);
    } catch (err) {
      warnings.push(`Curation failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // If curation timed out, use keyword-based auto scoring
    if (curatedArticles.length === 0 && allArticles.length > 0) {
      logger.info('pipeline', 'Auto-scoring articles (keyword-based)');
      for (const article of allArticles) {
        const score = scoreArticle(article);
        const { data } = await supabase.from('articles').insert({
          title: article.title, url: article.url, source: article.source,
          content_type: article.content_type, published_at: article.published_at,
          summary: article.summary, matched_keywords: article.matched_keywords,
          batch_id: batchId,
          relevance_score: score.relevance_score,
          urgency: score.urgency,
          category: score.category,
          impact_comment: score.impact_comment,
          key_findings: [], action_items: [],
        }).select().single();
        if (data) curatedArticles.push(data as Article);
      }
    }

    // Reload from DB
    const { data: freshArticles } = await supabase
      .from('articles').select('*').eq('batch_id', batchId)
      .order('relevance_score', { ascending: false });
    const finalArticles = (freshArticles || curatedArticles) as Article[];

    // Step 4: Brief + Trends (parallel, 12s timeout each)
    logger.info('pipeline', 'Step 4: Brief + Trends (parallel)');
    const [briefResult, trendResult] = await Promise.all([
      withTimeout(
        generateBrief(finalArticles),
        TIMEOUT.BRIEF,
        { brief: '브리프 생성 시간 초과', tokensIn: 0, tokensOut: 0, warning: 'Brief timed out' }
      ),
      withTimeout(
        detectTrends(finalArticles, batchId),
        TIMEOUT.TRENDS,
        { trends: [] as Trend[], tokensIn: 0, tokensOut: 0, warning: 'Trends timed out' }
      ),
    ]);

    const brief = briefResult.brief;
    const trends = trendResult.trends;
    metrics.tokens.input_total += briefResult.tokensIn + trendResult.tokensIn;
    metrics.tokens.output_total += briefResult.tokensOut + trendResult.tokensOut;
    if (briefResult.warning) warnings.push(briefResult.warning);
    if (trendResult.warning) warnings.push(trendResult.warning);

    // Step 5: Render & Send
    logger.info('pipeline', 'Step 5: Render & Send');
    const date = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    });
    const { subject, preheader } = generateSubjectLine(finalArticles, date);
    const html = renderNewsletter({
      articles: finalArticles, date, executiveBrief: brief,
      trends: trends || [], subjectLine: subject, preheaderText: preheader,
    });

    let recipients: string[];
    if (testEmail) {
      recipients = [testEmail];
    } else {
      const { data: recipientData } = await supabase
        .from('recipients').select('email').eq('enabled', true);
      recipients = (recipientData || []).map((r) => r.email);
    }
    metrics.sending.total = recipients.length;

    if (recipients.length > 0) {
      const result = await sendEmail({ to: recipients, subject, html });
      if (result.success) metrics.sending.sent = recipients.length;
      else { metrics.sending.failed = recipients.length; warnings.push(`Email failed: ${result.error}`); }
    }

    metrics.estimated_cost_usd = (metrics.tokens.input_total * 2 + metrics.tokens.output_total * 10) / 1_000_000;
    metrics.duration_ms = Date.now() - start;

    await supabase.from('pipeline_runs').update({
      status: 'completed', completed_at: new Date().toISOString(),
      articles_count: finalArticles.length, executive_brief: brief,
      trend_summary: (trends || []).map((t) => t.trend_title).join(', '), metrics,
    }).eq('id', run.id);

    return {
      batchId, articlesCount: finalArticles.length, deepCuratedCount: 0,
      trendsCount: trends?.length || 0, sent: metrics.sending.sent,
      errors, warnings, status: 'completed', metrics,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('pipeline', `Pipeline failed: ${msg}`);
    await supabase.from('pipeline_runs').update({
      status: 'failed', completed_at: new Date().toISOString(),
      error: msg, metrics: { ...metrics, duration_ms: Date.now() - start },
    }).eq('id', run.id);
    return {
      batchId, articlesCount: 0, deepCuratedCount: 0, trendsCount: 0, sent: 0,
      errors: [...errors, msg], warnings, status: 'failed',
      metrics: { ...metrics, duration_ms: Date.now() - start },
    };
  }
}
