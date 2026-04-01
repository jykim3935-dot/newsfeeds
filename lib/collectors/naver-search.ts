import type { CollectedArticle, KeywordGroup } from '@/lib/types';
import type { Collector } from './base';
import { getSupabaseAdmin } from '@/lib/clients/supabase';
import { logger } from '@/lib/utils/logger';

// Naver Search API — https://developers.naver.com/docs/serviceapi/search/news/news.md
// Free: 25,000 requests/day
async function searchNaver(query: string): Promise<Array<{ title: string; link: string; description: string; pubDate: string }>> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return [];

  const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=5&sort=date`;
  const res = await fetch(url, {
    headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret },
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
}

export const naverSearchCollector: Collector = {
  name: 'naver',
  async collect(batchId: string): Promise<CollectedArticle[]> {
    const clientId = process.env.NAVER_CLIENT_ID;
    if (!clientId) {
      logger.warn('naver', 'NAVER_CLIENT_ID not set, skipping');
      return [];
    }

    const supabase = getSupabaseAdmin();
    const { data: groups } = await supabase
      .from('keyword_groups')
      .select('*')
      .eq('enabled', true)
      .order('priority')
      .limit(10);

    if (!groups || groups.length === 0) return [];

    const results: CollectedArticle[] = [];

    // Search each keyword group in parallel
    const promises = (groups as KeywordGroup[]).map(async (group) => {
      const articles: CollectedArticle[] = [];
      // Use first 3 keywords joined by space for better results
      const query = group.keywords.slice(0, 3).join(' ');
      
      try {
        const items = await searchNaver(query);
        for (const item of items) {
          // Clean HTML tags from title and description
          const title = item.title.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ');
          const desc = item.description.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ');
          
          articles.push({
            title,
            url: item.link,
            source: 'Naver News',
            content_type: group.content_types[0] || 'news',
            published_at: item.pubDate ? new Date(item.pubDate).toISOString().split('T')[0] : null,
            summary: desc.slice(0, 500),
            matched_keywords: group.keywords,
            batch_id: batchId,
          });
        }
      } catch (err) {
        logger.warn('naver', `Search failed for ${group.group_name}: ${err instanceof Error ? err.message : String(err)}`);
      }
      
      return articles;
    });

    const allResults = await Promise.allSettled(promises);
    for (const r of allResults) {
      if (r.status === 'fulfilled') results.push(...r.value);
    }

    logger.info('naver', `Collected ${results.length} articles from Naver`);
    return results;
  },
};
