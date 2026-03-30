import Parser from 'rss-parser';
import type { CollectedArticle, Source } from '@/lib/types';
import type { Collector } from './base';
import { getSupabaseAdmin } from '@/lib/clients/supabase';
import { logger } from '@/lib/utils/logger';

const parser = new Parser({ timeout: 5000 });

async function fetchFeed(source: Source, batchId: string): Promise<CollectedArticle[]> {
  const feed = await parser.parseURL(source.url);
  return (feed.items || []).slice(0, 5).filter((item) => item.title && item.link).map((item) => ({
    title: item.title!,
    url: item.link!,
    source: source.name,
    content_type: source.content_type,
    published_at: item.pubDate ? new Date(item.pubDate).toISOString().split('T')[0] : null,
    summary: item.contentSnippet?.slice(0, 500) || null,
    matched_keywords: [],
    batch_id: batchId,
  }));
}

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

    // 전체 병렬 실행 + 개별 5초 타임아웃
    const results = await Promise.allSettled(
      (sources as Source[]).map(async (source) => {
        try {
          const articles = await fetchFeed(source, batchId);
          return articles;
        } catch {
          return [] as CollectedArticle[];
        }
      })
    );

    const all: CollectedArticle[] = [];
    let ok = 0;
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.length > 0) {
        all.push(...r.value);
        ok++;
      }
    }

    logger.info('rss', `${ok}/${sources.length} feeds, ${all.length} articles`);
    return all;
  },
};
