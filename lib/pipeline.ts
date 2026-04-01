import { runCollect } from './pipeline/collect';
import { runProcess } from './pipeline/process';
import { runSend } from './pipeline/send';
import { logger } from '@/lib/utils/logger';
import type { PipelineResult, PipelineMetrics, Trend } from '@/lib/types';

export async function runPipeline(testEmail?: string): Promise<PipelineResult> {
  const start = Date.now();
  const warnings: string[] = [];

  // Phase A: Collect (with error isolation)
  let collectResult: { batchId: string; articlesCount: number; warnings: string[]; metrics: Partial<PipelineMetrics> } = { batchId: '', articlesCount: 0, warnings: [], metrics: { collectors: {} } };
  try {
    collectResult = await runCollect();
    warnings.push(...collectResult.warnings);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    warnings.push(`Collection failed: ${msg}`);
    logger.error('pipeline', `Collection failed: ${msg}`);
  }

  if (!collectResult.batchId) {
    return {
      batchId: '', articlesCount: 0, deepCuratedCount: 0, trendsCount: 0, sent: 0,
      errors: [], warnings, status: 'failed',
      metrics: { duration_ms: Date.now() - start, collectors: {} as PipelineMetrics['collectors'], curation: { basic: { processed: 0, api_calls: 0 }, deep: { processed: 0, api_calls: 0 } }, tokens: { input_total: 0, output_total: 0 }, estimated_cost_usd: 0, sending: { total: 0, sent: 0, failed: 0 } },
    };
  }

  // Phase B: Process (brief + deep curation + trends, with error isolation)
  let processResult: { brief: string; deepCuratedCount: number; trendsCount: number; trends: Trend[]; tokensIn: number; tokensOut: number; warnings: string[] } = { brief: '', deepCuratedCount: 0, trendsCount: 0, trends: [], tokensIn: 0, tokensOut: 0, warnings: [] };
  try {
    processResult = await runProcess(collectResult.batchId);
    warnings.push(...processResult.warnings);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    warnings.push(`Process failed: ${msg}`);
    logger.error('pipeline', `Process failed: ${msg}`);
  }

  // Phase C: Send (with error isolation)
  let sendResult = { sent: 0, warnings: [] as string[] };
  try {
    sendResult = await runSend(collectResult.batchId, testEmail);
    warnings.push(...sendResult.warnings);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    warnings.push(`Send failed: ${msg}`);
    logger.error('pipeline', `Send failed: ${msg}`);
  }

  const costEstimate = (processResult.tokensIn * 2 + processResult.tokensOut * 10) / 1_000_000;

  return {
    batchId: collectResult.batchId,
    articlesCount: collectResult.articlesCount,
    deepCuratedCount: processResult.deepCuratedCount,
    trendsCount: processResult.trendsCount,
    sent: sendResult.sent,
    errors: [],
    warnings,
    status: 'completed',
    metrics: {
      duration_ms: Date.now() - start,
      collectors: (collectResult.metrics.collectors || {}) as PipelineMetrics['collectors'],
      curation: {
        basic: { processed: collectResult.articlesCount, api_calls: 0 },
        deep: { processed: processResult.deepCuratedCount, api_calls: processResult.deepCuratedCount > 0 ? 1 : 0 },
      },
      tokens: { input_total: processResult.tokensIn, output_total: processResult.tokensOut },
      estimated_cost_usd: costEstimate,
      sending: { total: sendResult.sent, sent: sendResult.sent, failed: 0 },
    },
  };
}
