import type { Article } from '@/lib/types';

export function generateSubjectLine(articles: Article[], date: string): { subject: string; preheader: string } {
  const redArticles = articles.filter((a) => a.urgency === 'red');
  const topArticle = redArticles[0] || articles.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))[0];

  const headline = topArticle
    ? topArticle.title.slice(0, 35)
    : 'AI 인프라 동향';

  const total = articles.length;
  const subject = `[ACRYL Intel] ${headline} 외 ${total - 1}건`;

  // Ensure subject is under 55 chars
  const trimmedSubject = subject.length > 55
    ? subject.slice(0, 52) + '...'
    : subject;

  const redCount = redArticles.length;
  const preheader = redCount > 0
    ? `🔴 긴급 ${redCount}건 포함 · ${date}`
    : `📊 총 ${total}건 분석 완료 · ${date}`;

  return { subject: trimmedSubject, preheader };
}
