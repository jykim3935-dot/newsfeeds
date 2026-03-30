import { logger } from '@/lib/utils/logger';
import type { CollectedArticle } from '@/lib/types';
import { createHash } from 'crypto';

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname.replace(/\/$/, '')}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function titleHash(title: string): string {
  return createHash('md5').update(title.slice(0, 40).toLowerCase().trim()).digest('hex');
}

/**
 * 배치 내 중복만 제거 (URL + 제목 기준).
 * DB seen_urls는 사용하지 않음 — 매일 같은 RSS를 수집하므로
 * 크로스배치 디덥은 오히려 기사를 0건으로 만듦.
 */
export async function dedup(articles: CollectedArticle[]): Promise<CollectedArticle[]> {
  const seenUrl = new Set<string>();
  const seenTitle = new Set<string>();

  const deduped = articles.filter((a) => {
    const uKey = normalizeUrl(a.url);
    const tKey = titleHash(a.title);
    if (seenUrl.has(uKey) || seenTitle.has(tKey)) return false;
    seenUrl.add(uKey);
    seenTitle.add(tKey);
    return true;
  });

  logger.info('dedup', `${articles.length} → ${deduped.length} (${articles.length - deduped.length} duplicates removed)`);
  return deduped;
}

// 하위 호환용 (테스트에서 사용)
export const deduplicateArticles = (articles: CollectedArticle[]) => {
  const seenUrl = new Set<string>();
  const seenTitle = new Set<string>();
  return articles.filter((a) => {
    const uKey = normalizeUrl(a.url);
    const tKey = titleHash(a.title);
    if (seenUrl.has(uKey) || seenTitle.has(tKey)) return false;
    seenUrl.add(uKey);
    seenTitle.add(tKey);
    return true;
  });
};

export async function cleanupOldUrls(): Promise<number> {
  return 0; // seen_urls 미사용
}
