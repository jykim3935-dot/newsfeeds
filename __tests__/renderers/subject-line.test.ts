import { describe, it, expect } from 'vitest';
import { generateSubjectLine } from '@/lib/renderers/subject-line';
import type { Article } from '@/lib/types';

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: '1', title: '테스트 기사', url: 'https://example.com', source: 'test',
    content_type: 'news', category: 'tech', urgency: 'green' as const,
    relevance_score: 5, summary: '', batch_id: 'b1', matched_keywords: [],
    published_at: '', impact_comment: '', key_findings: [], action_items: [],
    ...overrides,
  } as Article;
}

describe('generateSubjectLine', () => {
  it('should generate subject with top article title', () => {
    const articles = [makeArticle({ title: 'AI 혁명이 시작되다' })];
    const { subject, preheader } = generateSubjectLine(articles, '2026년 4월 1일');
    expect(subject).toContain('ACRYL Intel');
    expect(subject).toContain('AI 혁명이 시작되다');
    expect(subject.length).toBeLessThanOrEqual(55);
    expect(preheader).toContain('총 1건');
  });

  it('should include red urgency count in preheader', () => {
    const articles = [
      makeArticle({ urgency: 'red', title: '긴급 뉴스' }),
      makeArticle({ title: '일반 뉴스' }),
    ];
    const { preheader } = generateSubjectLine(articles, '2026년 4월 1일');
    expect(preheader).toContain('긴급 1건');
  });

  it('should truncate long subjects to 55 chars', () => {
    const articles = [makeArticle({ title: '매우 긴 제목의 기사가 있습니다 이것은 정말로 매우 긴 제목입니다 계속 이어집니다' })];
    const { subject } = generateSubjectLine(articles, '2026년 4월 1일');
    expect(subject.length).toBeLessThanOrEqual(55);
  });
});
