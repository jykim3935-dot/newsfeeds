import { collectors } from '@/lib/collectors';
import { basicCuration, deepCuration } from '@/lib/processors/curator';
import { detectTrends } from '@/lib/processors/trend-detector';
import { generateBrief } from '@/lib/processors/executive-brief';
import { renderNewsletter } from '@/lib/renderers/newsletter';
import { generateSubjectLine } from '@/lib/renderers/subject-line';
import { dedup } from '@/lib/utils/dedup';
import { sendEmail } from '@/lib/clients/resend';
import { getSupabaseAdmin } from '@/lib/clients/supabase';
import { logger } from '@/lib/utils/logger';
import type { PipelineResult, PipelineMetrics, CollectedArticle, Article, Trend } from '@/lib/types';

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
    curation: {
      basic: { processed: 0, api_calls: 0 },
      deep: { processed: 0, api_calls: 0 },
    },
    tokens: { input_total: 0, output_total: 0 },
    estimated_cost_usd: 0,
    sending: { total: 0, sent: 0, failed: 0 },
  };

  try {
    // Step 1: Collection
    logger.info('pipeline', 'Step 1: Collection started');
    let allArticles: CollectedArticle[] = [];

    for (const collector of collectors) {
      const cStart = Date.now();
      try {
        const articles = await collector.collect(batchId);
        allArticles.push(...articles);
        metrics.collectors[collector.name] = {
          count: articles.length,
          duration_ms: Date.now() - cStart,
          errors: [],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        metrics.collectors[collector.name] = {
          count: 0,
          duration_ms: Date.now() - cStart,
          errors: [msg],
        };
        warnings.push(`Collector ${collector.name} failed: ${msg}`);
      }
    }

    // Step 2: Dedup
    logger.info('pipeline', `Step 2: Dedup (${allArticles.length} articles)`);
    try {
      allArticles = await dedup(allArticles);
    } catch (err) {
      warnings.push(`Dedup failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Step 3: Basic Curation
    logger.info('pipeline', `Step 3: Basic Curation (${allArticles.length} articles)`);
    let curatedArticles: Article[] = [];
    try {
      const curationResult = await basicCuration(allArticles, batchId);
      curatedArticles = curationResult.articles;
      metrics.curation.basic = { processed: curatedArticles.length, api_calls: curationResult.apiCalls };
      metrics.tokens.input_total += curationResult.tokensIn;
      metrics.tokens.output_total += curationResult.tokensOut;
      warnings.push(...curationResult.warnings);
    } catch (err) {
      errors.push(`Basic curation failed: ${err instanceof Error ? err.message : String(err)}`);
      curatedArticles = [];
    }

    // Step 4: Deep Curation
    logger.info('pipeline', 'Step 4: Deep Curation');
    let deepCount = 0;
    try {
      const deepResult = await deepCuration(curatedArticles);
      deepCount = deepResult.deepCount;
      metrics.curation.deep = { processed: deepCount, api_calls: deepResult.apiCalls };
      metrics.tokens.input_total += deepResult.tokensIn;
      metrics.tokens.output_total += deepResult.tokensOut;
      warnings.push(...deepResult.warnings);
    } catch (err) {
      warnings.push(`Deep curation failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Reload articles with deep curation data
    const { data: freshArticles } = await supabase
      .from('articles')
      .select('*')
      .eq('batch_id', batchId)
      .order('relevance_score', { ascending: false });

    const finalArticles = freshArticles || curatedArticles;

    // Step 5: Trend Detection
    logger.info('pipeline', 'Step 5: Trend Detection');
    let trends: Trend[] = [];
    try {
      const trendResult = await detectTrends(finalArticles, batchId);
      trends = trendResult.trends;
      metrics.tokens.input_total += trendResult.tokensIn;
      metrics.tokens.output_total += trendResult.tokensOut;
      if (trendResult.warning) warnings.push(trendResult.warning);
    } catch (err) {
      trends = [];
      warnings.push(`Trend detection failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Step 6: Executive Brief
    logger.info('pipeline', 'Step 6: Executive Brief');
    let brief = '';
    try {
      const briefResult = await generateBrief(finalArticles);
      brief = briefResult.brief;
      metrics.tokens.input_total += briefResult.tokensIn;
      metrics.tokens.output_total += briefResult.tokensOut;
      if (briefResult.warning) warnings.push(briefResult.warning);
    } catch (err) {
      brief = '브리프 생성 실패';
      warnings.push(`Brief failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Step 7: Render & Send
    logger.info('pipeline', 'Step 7: Render & Send');
    const date = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    });

    const { subject, preheader } = generateSubjectLine(finalArticles, date);

    const html = renderNewsletter({
      articles: finalArticles,
      date,
      executiveBrief: brief,
      trends: trends || [],
      subjectLine: subject,
      preheaderText: preheader,
    });

    // Get recipients
    let recipients: string[];
    if (testEmail) {
      recipients = [testEmail];
    } else {
      const { data: recipientData } = await supabase
        .from('recipients')
        .select('email')
        .eq('enabled', true);
      recipients = (recipientData || []).map((r) => r.email);
    }

    metrics.sending.total = recipients.length;

    if (recipients.length > 0) {
      const result = await sendEmail({ to: recipients, subject, html });
      if (result.success) {
        metrics.sending.sent = recipients.length;
      } else {
        metrics.sending.failed = recipients.length;
        warnings.push(`Email sending failed: ${result.error}`);
      }
    }

    // Calculate cost
    // Haiku: $0.80/M input, $4/M output; Sonnet: $3/M input, $15/M output
    // Rough estimate
    metrics.estimated_cost_usd = (metrics.tokens.input_total * 2 + metrics.tokens.output_total * 10) / 1_000_000;
    metrics.duration_ms = Date.now() - start;

    // Update pipeline run
    await supabase.from('pipeline_runs').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      articles_count: finalArticles.length,
      executive_brief: brief,
      trend_summary: (trends || []).map((t) => t.trend_title).join(', '),
      metrics,
    }).eq('id', run.id);

    logger.info('pipeline', `Pipeline completed: ${finalArticles.length} articles, ${deepCount} deep, ${trends?.length || 0} trends`);

    return {
      batchId,
      articlesCount: finalArticles.length,
      deepCuratedCount: deepCount,
      trendsCount: trends?.length || 0,
      sent: metrics.sending.sent,
      errors,
      warnings,
      status: 'completed',
      metrics,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('pipeline', `Pipeline failed: ${msg}`);

    await supabase.from('pipeline_runs').update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error: msg,
      metrics: { ...metrics, duration_ms: Date.now() - start },
    }).eq('id', run.id);

    return {
      batchId,
      articlesCount: 0,
      deepCuratedCount: 0,
      trendsCount: 0,
      sent: 0,
      errors: [...errors, msg],
      warnings,
      status: 'failed',
      metrics: { ...metrics, duration_ms: Date.now() - start },
    };
  }
}
