import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/clients/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = getSupabaseAdmin();
  const debug: Record<string, unknown> = {};

  // 최근 파이프라인 실행
  const { data: runs } = await supabase
    .from('pipeline_runs')
    .select('id, batch_id, status, started_at, completed_at, articles_count, error, metrics')
    .order('created_at', { ascending: false })
    .limit(5);
  debug.recent_runs = runs;

  // 소스 수
  const { count: srcCount } = await supabase.from('sources').select('*', { count: 'exact', head: true }).eq('enabled', true);
  debug.enabled_sources = srcCount;

  // 키워드 그룹 수
  const { count: kwCount } = await supabase.from('keyword_groups').select('*', { count: 'exact', head: true }).eq('enabled', true);
  debug.enabled_keywords = kwCount;

  // 전체 기사 수
  const { count: artCount } = await supabase.from('articles').select('*', { count: 'exact', head: true });
  debug.total_articles = artCount;

  // 최신 배치 기사 수
  if (runs && runs[0]?.batch_id) {
    const { count: batchCount } = await supabase.from('articles').select('*', { count: 'exact', head: true }).eq('batch_id', runs[0].batch_id);
    debug.latest_batch_articles = batchCount;
    debug.latest_batch_id = runs[0].batch_id;
  }

  // seen_urls 수
  const { count: seenCount } = await supabase.from('seen_urls').select('*', { count: 'exact', head: true });
  debug.seen_urls = seenCount;

  // 최신 기사 5건 (점수순)
  const { data: topArticles } = await supabase
    .from('articles')
    .select('title, source, relevance_score, urgency, impact_comment, batch_id')
    .order('created_at', { ascending: false })
    .limit(5);
  debug.recent_articles = topArticles;

  return NextResponse.json(debug, { status: 200 });
}
