import { describe, it, expect } from 'vitest';
import { renderNewsletter } from '@/lib/renderers/newsletter';
import type { Article, Trend, NewsletterData } from '@/lib/types';

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: '1', title: '테스트 기사', url: 'https://example.com', source: 'test',
    content_type: 'news', category: 'tech', urgency: 'green' as const,
    relevance_score: 5, summary: '요약입니다', batch_id: 'b1', matched_keywords: [],
    published_at: '2026-04-01', impact_comment: '테스트 영향', key_findings: [], action_items: [],
    ...overrides,
  } as Article;
}

function makeData(overrides: Partial<NewsletterData> = {}): NewsletterData {
  return {
    articles: [makeArticle({ relevance_score: 8, urgency: 'red' }), makeArticle({ relevance_score: 6 })],
    date: '2026년 4월 1일 화요일',
    executiveBrief: '오늘의 핵심 브리프입니다.',
    trends: [],
    subjectLine: '[ACRYL Intel] 테스트',
    preheaderText: '📊 총 2건 분석 완료',
    ...overrides,
  };
}

describe('renderNewsletter', () => {
  it('should render valid HTML with table layout', () => {
    const html = renderNewsletter(makeData());
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('ACRYL Intelligence Brief');
    expect(html).toContain('오늘의 핵심');
  });

  it('should NOT contain flex or gradient CSS', () => {
    const html = renderNewsletter(makeData());
    expect(html).not.toContain('display:flex');
    expect(html).not.toContain('display: flex');
    expect(html).not.toContain('linear-gradient');
    expect(html).not.toContain('radial-gradient');
  });

  it('should NOT contain float CSS', () => {
    const html = renderNewsletter(makeData());
    expect(html).not.toContain('float:');
    expect(html).not.toContain('float :');
  });

  it('should be under 102KB', () => {
    const articles = Array.from({ length: 50 }, (_, i) =>
      makeArticle({ id: String(i), title: `기사 ${i}`, relevance_score: 9 - (i % 5), urgency: i < 5 ? 'red' : 'green' })
    );
    const html = renderNewsletter(makeData({ articles }));
    expect(Buffer.byteLength(html, 'utf8')).toBeLessThan(102 * 1024);
  });

  it('should render trends section when trends provided', () => {
    const trends: Trend[] = [{
      id: '1', batch_id: 'b1', trend_title: 'AI 트렌드',
      trend_description: '설명', related_article_ids: [], category: 'tech', strength: 'rising',
      created_at: '2026-04-01',
    }];
    const html = renderNewsletter(makeData({ trends }));
    expect(html).toContain('AI 트렌드');
    expect(html).toContain('트렌드');
  });

  it('should escape HTML entities', () => {
    const articles = [makeArticle({ title: '<script>alert("xss")</script>', relevance_score: 8 })];
    const html = renderNewsletter(makeData({ articles }));
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
