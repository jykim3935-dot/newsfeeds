import type { CollectedArticle } from '@/lib/types';
import type { Collector } from './base';
import { callClaude } from '@/lib/clients/anthropic';
import { safeParseJSON } from '@/lib/utils/json-parser';
import { GOV_SEARCH_PROMPT } from '@/lib/prompts/collection';
import { logger } from '@/lib/utils/logger';

const GOV_KEYWORDS = ['AI 정책', 'GPU 인프라', 'AI기본법', '공공 AI', 'AI 데이터센터', '디지털뉴딜'];

export const govCollector: Collector = {
  name: 'gov',
  async collect(batchId: string): Promise<CollectedArticle[]> {
    try {
      const result = await callClaude({
        model: 'fast',
        userMessage: `${GOV_SEARCH_PROMPT} ${GOV_KEYWORDS.join(', ')}`,
        label: 'gov-search',
      });

      const text = result.message.content[0]?.type === 'text'
        ? (result.message.content[0] as { type: 'text'; text: string }).text
        : '';
      const parsed = safeParseJSON<{ articles?: Array<{ title: string; url: string; source?: string; published_at?: string; summary?: string }> }>(text, { articles: [] });

      const articles: CollectedArticle[] = (parsed.articles || [])
        .filter((a) => a.title && a.url)
        .map((a) => ({
          title: a.title,
          url: a.url,
          source: a.source || '정부부처',
          content_type: 'government' as const,
          published_at: a.published_at || null,
          summary: a.summary || null,
          matched_keywords: GOV_KEYWORDS,
          batch_id: batchId,
        }));

      logger.info('gov', `Collected ${articles.length} gov articles`);
      return articles;
    } catch (err) {
      logger.error('gov', `Gov collection failed: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  },
};
