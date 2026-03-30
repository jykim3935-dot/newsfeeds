import type { CollectedArticle } from '@/lib/types';
import type { Collector } from './base';
import { callClaude } from '@/lib/clients/anthropic';
import { safeParseJSON } from '@/lib/utils/json-parser';
import { RESEARCH_SEARCH_PROMPT } from '@/lib/prompts/collection';
import { logger } from '@/lib/utils/logger';

const RESEARCH_KEYWORDS = ['GPU scheduling', 'model serving', 'AI agent', 'MLOps', 'medical AI', 'MCP protocol'];

export const researchCollector: Collector = {
  name: 'research',
  async collect(batchId: string): Promise<CollectedArticle[]> {
    try {
      const result = await callClaude({
        model: 'fast',
        userMessage: `${RESEARCH_SEARCH_PROMPT} ${RESEARCH_KEYWORDS.join(', ')}`,
        label: 'research-search',
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
          source: a.source || 'arXiv',
          content_type: 'research' as const,
          published_at: a.published_at || null,
          summary: a.summary || null,
          matched_keywords: RESEARCH_KEYWORDS,
          batch_id: batchId,
        }));

      logger.info('research', `Collected ${articles.length} research articles`);
      return articles;
    } catch (err) {
      logger.error('research', `Research collection failed: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  },
};
