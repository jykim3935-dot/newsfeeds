import Parser from 'rss-parser';
import type { CollectedArticle, Source } from '@/lib/types';
import type { Collector } from './base';
import { getSupabaseAdmin } from '@/lib/clients/supabase';
import { logger } from '@/lib/utils/logger';

const parser = new Parser({ timeout: 10000 });

export const rssCollector: Collector = {
  name: 'rss',
  async collect(batchId: string): Promise<CollectedArticle[]> {
    const supabase = getSupabaseAdmin();
    const { data: sources } = await supabase
      .from('sources')
      .select('*')
      .eq('type', 'rss')
      .eq('enabled', true);

    if (!sources || sources.length === 0) return [];

    const results: CollectedArticle[] = [];

    for (const source of sources as Source[]) {
      try {
        const feed = await parser.parseURL(source.url);
        const items = (feed.items || []).slice(0, 10);

        for (const item of items) {
          if (!item.title || !item.link) continue;
          results.push({
            title: item.title,
            url: item.link,
            source: source.name,
            content_type: source.content_type,
            published_at: item.pubDate ? new Date(item.pubDate).toISOString().split('T')[0] : null,
            summary: item.contentSnippet?.slice(0, 500) || null,
            matched_keywords: [],
            batch_id: batchId,
          });
        }

        logger.info('rss', `Collected ${items.length} items from ${source.name}`);
      } catch (err) {
        logger.error('rss', `Failed to collect from ${source.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return results;
  },
};
