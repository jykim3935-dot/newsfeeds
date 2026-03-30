import { describe, it, expect } from 'vitest';
import { deduplicateArticles } from '@/lib/utils/dedup';
import type { CollectedArticle } from '@/lib/types';

const makeArticle = (title: string, url: string): CollectedArticle => ({
  title,
  url,
  source: 'test',
  content_type: 'news',
  published_at: null,
  summary: null,
  matched_keywords: [],
  batch_id: 'batch-1',
});

describe('deduplicateArticles', () => {
  it('removes URL duplicates', () => {
    const articles = [
      makeArticle('Article A', 'https://example.com/a'),
      makeArticle('Article B', 'https://example.com/a'),
    ];
    expect(deduplicateArticles(articles)).toHaveLength(1);
  });

  it('removes title duplicates (first 40 chars)', () => {
    const articles = [
      makeArticle('Same title here for dedup testing purposes', 'https://a.com/1'),
      makeArticle('Same title here for dedup testing purposes', 'https://b.com/2'),
    ];
    expect(deduplicateArticles(articles)).toHaveLength(1);
  });

  it('keeps unique articles', () => {
    const articles = [
      makeArticle('Article A', 'https://a.com/1'),
      makeArticle('Article B', 'https://b.com/2'),
    ];
    expect(deduplicateArticles(articles)).toHaveLength(2);
  });
});
