import { NextResponse } from 'next/server';
import { runPipeline } from '@/lib/pipeline';
import { cleanupOldUrls } from '@/lib/utils/dedup';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    logger.info('cron', 'Daily cron started');

    // Cleanup old URLs (30-day policy)
    try {
      await cleanupOldUrls();
    } catch (err) {
      logger.warn('cron', `URL cleanup failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    const result = await runPipeline();
    logger.info('cron', 'Daily cron completed', { articles: result.articlesCount, sent: result.sent });

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('cron', `Daily cron failed: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
