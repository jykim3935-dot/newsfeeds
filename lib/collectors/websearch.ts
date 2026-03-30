import type { CollectedArticle, KeywordGroup } from '@/lib/types';
import type { Collector } from './base';
import { safeParseJSON } from '@/lib/utils/json-parser';
import { logger } from '@/lib/utils/logger';

// Claude API with web_search tool (raw fetch — SDK doesn't support web_search yet)
async function claudeWebSearch(query: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
      messages: [{
        role: 'user',
        content: `다음 키워드와 관련된 최신 뉴스를 웹에서 검색하세요: ${query}

검색 결과를 다음 JSON 형식으로 정리하세요:
{"articles": [{"title": "제목", "url": "URL", "source": "출처", "published_at": "YYYY-MM-DD", "summary": "3-4문장 요약"}]}

최대 5건, JSON만 반환하세요.`,
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API ${res.status}: ${err}`);
  }

  const data = await res.json();
  let text = '';
  for (const block of data.content || []) {
    if (block.type === 'text') text += block.text;
  }
  return text;
}

export const websearchCollector: Collector = {
  name: 'websearch',
  async collect(batchId: string): Promise<CollectedArticle[]> {
    const { getSupabaseAdmin } = await import('@/lib/clients/supabase');
    const supabase = getSupabaseAdmin();
    const { data: groups } = await supabase
      .from('keyword_groups')
      .select('*')
      .eq('enabled', true)
      .order('priority')
      .limit(6);

    if (!groups || groups.length === 0) return [];

    const results: CollectedArticle[] = [];
    const topGroups = (groups as KeywordGroup[]).filter((g) => g.priority === 1).slice(0, 3);

    for (const group of topGroups) {
      try {
        const query = group.keywords.slice(0, 5).join(' OR ');
        const text = await claudeWebSearch(query);

        const parsed = safeParseJSON<{ articles?: Array<{ title: string; url: string; source?: string; published_at?: string; summary?: string }> }>(text, { articles: [] });

        for (const article of parsed.articles || []) {
          if (!article.title || !article.url) continue;
          results.push({
            title: article.title,
            url: article.url,
            source: article.source || 'Claude Search',
            content_type: group.content_types[0] || 'news',
            published_at: article.published_at || null,
            summary: article.summary || null,
            matched_keywords: group.keywords,
            batch_id: batchId,
          });
        }

        logger.info('websearch', `Claude search: ${parsed.articles?.length || 0} from "${group.group_name}"`);
      } catch (err) {
        logger.warn('websearch', `Claude search failed for ${group.group_name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return results;
  },
};
