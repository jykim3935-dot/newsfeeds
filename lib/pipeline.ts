import { runCollect } from './pipeline/collect';
import { runProcess } from './pipeline/process';
import { runSend } from './pipeline/send';
import { logger } from '@/lib/utils/logger';
import type { PipelineResult, PipelineMetrics } from '@/lib/types';

export async function runPipeline(testEmail?: string): Promise<PipelineResult> {
  const start = Date.now();

  // Phase A: Collect
  const collectResult = await runCollect();

  // Phase B: Process (brief)
  const processResult = await runProcess(collectResult.batchId);

  // Phase C: Send
  const sendResult = await runSend(collectResult.batchId, testEmail);

  const warnings = [...collectResult.warnings, ...processResult.warnings, ...sendResult.warnings];

  return {
    batchId: collectResult.batchId,
    articlesCount: collectResult.articlesCount,
    deepCuratedCount: 0,
    trendsCount: 0,
    sent: sendResult.sent,
    errors: [],
    warnings,
    status: 'completed',
    metrics: {
      duration_ms: Date.now() - start,
      collectors: (collectResult.metrics.collectors || {}) as PipelineMetrics['collectors'],
      curation: { basic: { processed: collectResult.articlesCount, api_calls: 0 }, deep: { processed: 0, api_calls: 0 } },
      tokens: { input_total: 0, output_total: 0 },
      estimated_cost_usd: 0,
      sending: { total: sendResult.sent, sent: sendResult.sent, failed: 0 },
    },
  };
}
