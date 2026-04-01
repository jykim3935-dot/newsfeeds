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
  const letters = text.replace(/[^a-zA-Z가-힣]/g, '');
  if (letters.length === 0) return false;
  const eng = letters.replace(/[^a-zA-Z]/g, '').length;
  return eng > letters.length * 0.5;
}

export async function runProcess(batchId: string): Promise<{ brief: string; warnings: string[] }> {
  const supabase = getSupabaseAdmin();
  const warnings: string[] = [];

  const { data } = await supabase.from('articles').select('*')
    .eq('batch_id', batchId)
    .order('relevance_score', { ascending: false });

  const articles = (data || []) as Article[];
  if (articles.length === 0) return { brief: '', warnings: ['No articles found'] };

  // Step 1: 영어 기사 번역 + 브리프 동시 실행
  const engArticles = articles.filter((a) => isEnglish(a.title) && (a.relevance_score || 0) >= 5).slice(0, 15);

  const [briefResult] = await Promise.all([
    withTimeout(generateBrief(articles), 20000, { brief: '', tokensIn: 0, tokensOut: 0, warning: 'Brief timed out' }),
    engArticles.length > 0
      ? withTimeout(translateAndSave(engArticles, supabase), 20000, null).catch(() => null)
      : Promise.resolve(null),
  ]);

  if (briefResult.warning) warnings.push(briefResult.warning);

  await supabase.from('pipeline_runs')
    .update({ executive_brief: briefResult.brief || null })
    .eq('batch_id', batchId);

  return { brief: briefResult.brief, warnings };
}

async function translateAndSave(articles: Article[], supabase: ReturnType<typeof getSupabaseAdmin>): Promise<void> {
  const titles = articles.map((a, i) => `${i}. ${a.title}`).join('\n');

  const result = await callClaude({
    model: 'fast',
    userMessage: `다음 영어 뉴스 제목을 간결한 한국어로 번역하세요.

{"translations": {"0": "한국어 제목", "1": "한국어 제목"}}

${titles}

JSON만 반환.`,
    label: 'translate',
    maxTokens: 1024,
  });

  const text = result.message.content[0]?.type === 'text'
    ? (result.message.content[0] as { type: 'text'; text: string }).text : '';
  const parsed = safeParseJSON<{ translations?: Record<string, string> }>(text, {});

  for (const [idx, kor] of Object.entries(parsed.translations || {})) {
    const article = articles[Number(idx)];
    if (!article || !kor) continue;
    await supabase.from('articles')
      .update({ title: `${article.title} (${kor})` })
      .eq('id', article.id);
  }

  logger.info('translate', `Translated ${Object.keys(parsed.translations || {}).length} titles`);
}
