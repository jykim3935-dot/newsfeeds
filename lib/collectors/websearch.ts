import type { CollectedArticle, KeywordGroup, ContentType } from '@/lib/types';
import type { Collector } from './base';
import { callClaude } from '@/lib/clients/anthropic';
import { getSupabaseAdmin } from '@/lib/clients/supabase';
import { safeParseJSON } from '@/lib/utils/json-parser';
import { WEB_SEARCH_PROMPTS } from '@/lib/prompts/collection';
import { logger } from '@/lib/utils/logger';

export const websearchCollector: Collector = {
  name: 'websearch',
  async collect(batchId: string): Promise<CollectedArticle[]> {
    const supabase = getSupabaseAdmin();
    const { data: groups } = await supabase
      .from('keyword_groups')
      .select('*')
      .eq('enabled', true)
      .order('priority');

    if (!groups || groups.length === 0) return [];

    const results: CollectedArticle[] = [];

    for (const group of groups as KeywordGroup[]) {
      for (const contentType of group.content_types) {
        const prompt = WEB_SEARCH_PROMPTS[contentType as ContentType];
        if (!prompt) continue;

        try {
          const result = await callClaude({
            model: 'fast',
            userMessage: `${prompt}\n\n키워드: ${group.keywords.join(', ')}`,
            label: `websearch-${group.group_name}-${contentType}`,
          });

          const text = result.message.content[0]?.type === 'text'
            ? (result.message.content[0] as { type: 'text'; text: string }).text
            : '';
          const parsed = safeParseJSON<{ articles?: Array<{ title: string; url: string; source?: string; published_at?: string; summary?: string }> }>(text, { articles: [] });

          for (const article of parsed.articles || []) {
            if (!article.title || !article.url) continue;
            results.push({
              title: article.title,
              url: article.url,
              source: article.source || 'websearch',
              content_type: contentType as ContentType,
              published_at: article.published_at || null,
              summary: article.summary || null,
              matched_keywords: group.keywords,
              batch_id: batchId,
            });
          }

          logger.info('websearch', `Collected ${parsed.articles?.length || 0} from ${group.group_name}/${contentType}`);
        } catch (err) {
          logger.error('websearch', `Failed ${group.group_name}/${contentType}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    return results;
  },
};
