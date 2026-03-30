import Parser from 'rss-parser';
import type { CollectedArticle, KeywordGroup } from '@/lib/types';
import type { Collector } from './base';
import { getSupabaseAdmin } from '@/lib/clients/supabase';
import { logger } from '@/lib/utils/logger';

const parser = new Parser({ timeout: 8000 });

// Google News RSS — 무료, API 키 불필요
// https://news.google.com/rss/search?q=keyword&hl=ko&gl=KR&ceid=KR:ko
function buildGoogleNewsUrl(keywords: string[], lang: 'ko' | 'en' = 'ko'): string {
  const query = keywords.slice(0, 3).join(' OR ');
  const encoded = encodeURIComponent(query);
  if (lang === 'ko') {
    return `https://news.google.com/rss/search?q=${encoded}&hl=ko&gl=KR&ceid=KR:ko`;
  }
  return `https://news.google.com/rss/search?q=${encoded}&hl=en&gl=US&ceid=US:en`;
}

export const googlenewsCollector: Collector = {
  name: 'googlenews',
  async collect(batchId: string): Promise<CollectedArticle[]> {
    const supabase = getSupabaseAdmin();
    const { data: groups } = await supabase
      .from('keyword_groups')
      .select('*')
      .eq('enabled', true)
      .order('priority')
      .limit(10);

    if (!groups || groups.length === 0) return [];

    const results: CollectedArticle[] = [];

    // 각 키워드 그룹별로 Google News 검색 (병렬)
    const promises = (groups as KeywordGroup[]).map(async (group) => {
      const articles: CollectedArticle[] = [];

      // 한국어 검색
      try {
        const url = buildGoogleNewsUrl(group.keywords, 'ko');
        const feed = await parser.parseURL(url);
        for (const item of (feed.items || []).slice(0, 5)) {
          if (!item.title || !item.link) continue;
          articles.push({
            title: item.title.replace(/ - .*$/, ''), // "제목 - 매체명" 에서 매체명 제거
            url: item.link,
            source: item.source?.name || extractSource(item.title) || 'Google News',
            content_type: group.content_types[0] || 'news',
            published_at: item.pubDate ? new Date(item.pubDate).toISOString().split('T')[0] : null,
            summary: item.contentSnippet?.slice(0, 500) || null,
            matched_keywords: group.keywords,
            batch_id: batchId,
          });
        }
      } catch (err) {
        logger.warn('googlenews', `KR search failed for ${group.group_name}: ${err instanceof Error ? err.message : String(err)}`);
      }

      // 영어 검색 (글로벌 키워드만)
      if (group.keywords.some((k) => /[a-zA-Z]/.test(k))) {
        try {
          const url = buildGoogleNewsUrl(group.keywords.filter((k) => /[a-zA-Z]/.test(k)), 'en');
          const feed = await parser.parseURL(url);
          for (const item of (feed.items || []).slice(0, 3)) {
            if (!item.title || !item.link) continue;
            articles.push({
              title: item.title.replace(/ - .*$/, ''),
              url: item.link,
              source: item.source?.name || extractSource(item.title) || 'Google News',
              content_type: 'global',
              published_at: item.pubDate ? new Date(item.pubDate).toISOString().split('T')[0] : null,
              summary: item.contentSnippet?.slice(0, 500) || null,
              matched_keywords: group.keywords,
              batch_id: batchId,
            });
          }
        } catch {
          // 영어 검색 실패는 무시
        }
      }

      return articles;
    });

    const allResults = await Promise.allSettled(promises);
    for (const r of allResults) {
      if (r.status === 'fulfilled') results.push(...r.value);
    }

    logger.info('googlenews', `Collected ${results.length} articles from Google News`);
    return results;
  },
};

function extractSource(title: string): string {
  const match = title.match(/ - (.+)$/);
  return match ? match[1].trim() : '';
}
