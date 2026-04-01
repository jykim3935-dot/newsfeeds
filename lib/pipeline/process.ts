import { generateBrief } from '@/lib/processors/executive-brief';
import { callClaude } from '@/lib/clients/anthropic';
import { safeParseJSON } from '@/lib/utils/json-parser';
import { getSupabaseAdmin } from '@/lib/clients/supabase';
import { logger } from '@/lib/utils/logger';
import type { Article } from '@/lib/types';

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);
}

function isEnglish(text: string): boolean {
  const ascii = text.replace(/[^a-zA-Z]/g, '');
  return ascii.length > text.length * 0.4;
}

export async function runProcess(batchId: string): Promise<{ brief: string; warnings: string[] }> {
  const supabase = getSupabaseAdmin();
  const warnings: string[] = [];

  const { data } = await supabase.from('articles').select('*')
    .eq('batch_id', batchId)
    .order('relevance_score', { ascending: false });

  const articles = (data || []) as Article[];
  if (articles.length === 0) return { brief: '', warnings: ['No articles found'] };

  // Step 1: 영어 기사 제목 번역 (15초 타임아웃)
  try {
    const engArticles = articles.filter((a) => isEnglish(a.title) && (a.relevance_score || 0) >= 5);
    if (engArticles.length > 0) {
      await withTimeout(translateTitles(engArticles, supabase), 15000, null);
      logger.info('process', `Translated ${engArticles.length} English titles`);
    }
  } catch {
    warnings.push('Title translation failed');
  }

  // Step 2: 브리프 생성 (25초 타임아웃)
  const briefResult = await withTimeout(
    generateBrief(articles), 25000,
    { brief: '', tokensIn: 0, tokensOut: 0, warning: 'Brief timed out' }
  );
  if (briefResult.warning) warnings.push(briefResult.warning);

  await supabase.from('pipeline_runs')
    .update({ executive_brief: briefResult.brief || null })
    .eq('batch_id', batchId);

  logger.info('process', `Process done for batch ${batchId}`);
  return { brief: briefResult.brief, warnings };
}

async function translateTitles(articles: Article[], supabase: ReturnType<typeof getSupabaseAdmin>): Promise<void> {
  // 배치로 번역 요청 (한 번의 API 호출)
  const titles = articles.slice(0, 20).map((a, i) => `${i}. ${a.title}`).join('\n');

  const result = await callClaude({
    model: 'fast',
    userMessage: `다음 영어 뉴스 제목들을 간결한 한국어로 번역하세요. 번호와 함께 JSON으로 반환하세요.

{"translations": {"0": "한국어 제목", "1": "한국어 제목", ...}}

제목 목록:
${titles}

JSON만 반환하세요.`,
    label: 'translate-titles',
    maxTokens: 1024,
  });

  const text = result.message.content[0]?.type === 'text'
    ? (result.message.content[0] as { type: 'text'; text: string }).text : '';

  const parsed = safeParseJSON<{ translations?: Record<string, string> }>(text, { translations: {} });
  const translations = parsed.translations || {};

  // DB 업데이트: title을 "English Title (한국어 제목)" 형태로
  for (const [idx, korTitle] of Object.entries(translations)) {
    const article = articles[Number(idx)];
    if (!article || !korTitle) continue;

    await supabase.from('articles')
      .update({ title: `${article.title} (${korTitle})` })
      .eq('id', article.id);
  }
}
