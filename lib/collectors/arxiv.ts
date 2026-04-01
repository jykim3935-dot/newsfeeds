import Parser from 'rss-parser';
import type { CollectedArticle } from '@/lib/types';
import type { Collector } from './base';
import { logger } from '@/lib/utils/logger';

const parser = new Parser({ timeout: 5000 });

// arXiv API categories relevant to ACRYL
const ARXIV_QUERIES = [
  { query: 'GPU+scheduling+OR+GPU+orchestration', category: 'tech' },
  { query: 'AI+agent+OR+tool+use+OR+function+calling', category: 'tech' },
  { query: 'medical+AI+OR+healthcare+AI+diagnosis', category: 'tech' },
  { query: 'model+serving+OR+inference+optimization', category: 'tech' },
];

export const arxivCollector: Collector = {
  name: 'arxiv',
  async collect(batchId: string): Promise<CollectedArticle[]> {
    const results: CollectedArticle[] = [];

    const promises = ARXIV_QUERIES.map(async ({ query, category }) => {
      const articles: CollectedArticle[] = [];
      try {
        // arXiv API returns Atom XML, use RSS parser
        const url = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&sortBy=submittedDate&sortOrder=descending&max_results=3`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        const xml = await res.text();
        
        // Simple XML parsing for arXiv entries
        const entries = xml.split('<entry>').slice(1);
        for (const entry of entries) {
          const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
          const linkMatch = entry.match(/<id>([\s\S]*?)<\/id>/);
          const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
          const publishedMatch = entry.match(/<published>([\s\S]*?)<\/published>/);

          if (!titleMatch || !linkMatch) continue;

          const title = titleMatch[1].trim().replace(/\n/g, ' ');
          const url = linkMatch[1].trim();
          const summary = summaryMatch ? summaryMatch[1].trim().replace(/\n/g, ' ').slice(0, 500) : null;
          const published = publishedMatch ? publishedMatch[1].trim().split('T')[0] : null;

          articles.push({
            title,
            url,
            source: 'arXiv',
            content_type: 'research',
            published_at: published,
            summary,
            matched_keywords: query.split('+OR+').map(k => k.replace(/\+/g, ' ')),
            batch_id: batchId,
          });
        }
      } catch (err) {
        logger.warn('arxiv', `Query failed for ${query}: ${err instanceof Error ? err.message : String(err)}`);
      }
      return articles;
    });

    const allResults = await Promise.allSettled(promises);
    for (const r of allResults) {
      if (r.status === 'fulfilled') results.push(...r.value);
    }

    logger.info('arxiv', `Collected ${results.length} papers from arXiv`);
    return results;
  },
};
