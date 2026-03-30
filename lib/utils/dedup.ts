import { getSupabaseAdmin } from '@/lib/clients/supabase';
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

function hashUrl(url: string): string {
  return createHash('sha256').update(normalizeUrl(url)).digest('hex');
}

function titleHash(title: string): string {
  return createHash('md5').update(title.slice(0, 40).toLowerCase().trim()).digest('hex');
}

export function deduplicateArticles(articles: CollectedArticle[]): CollectedArticle[] {
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
}

export async function dedup(articles: CollectedArticle[]): Promise<CollectedArticle[]> {
  // Local dedup
  const seenUrl = new Set<string>();
  const seenTitle = new Set<string>();
  const localDeduped = articles.filter((a) => {
    const uKey = normalizeUrl(a.url);
    const tKey = titleHash(a.title);
    if (seenUrl.has(uKey) || seenTitle.has(tKey)) return false;
    seenUrl.add(uKey);
    seenTitle.add(tKey);
    return true;
  });

  // DB dedup against seen_urls
  try {
    const supabase = getSupabaseAdmin();
    const hashes = localDeduped.map((a) => hashUrl(a.url));
    const { data: existing } = await supabase
      .from('seen_urls')
      .select('url_hash')
      .in('url_hash', hashes);

    const existingSet = new Set((existing || []).map((r) => r.url_hash));
    const newArticles = localDeduped.filter((a) => !existingSet.has(hashUrl(a.url)));

    if (newArticles.length > 0) {
      await supabase.from('seen_urls').upsert(
        newArticles.map((a) => ({ url_hash: hashUrl(a.url), url: a.url })),
        { onConflict: 'url_hash' }
      );
    }

    logger.info('dedup', `${articles.length} → ${newArticles.length} articles after dedup`);
    return newArticles;
  } catch {
    logger.warn('dedup', 'DB dedup failed, using local dedup only');
    return localDeduped;
  }
}

export async function cleanupOldUrls(days = 30): Promise<number> {
  const supabase = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  const { count } = await supabase
    .from('seen_urls')
    .delete({ count: 'exact' })
    .lt('first_seen_at', cutoff);
  return count || 0;
}
