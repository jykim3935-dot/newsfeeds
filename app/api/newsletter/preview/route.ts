import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/clients/supabase';
import { renderNewsletter } from '@/lib/renderers/newsletter';
import { generateSubjectLine } from '@/lib/renderers/subject-line';
import type { Article, Trend } from '@/lib/types';

export async function GET() {
  const supabase = getSupabaseAdmin();

  // Get all recent articles (last 7 days) across all batches
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: articles } = await supabase
    .from('articles')
    .select('*')
    .gte('created_at', since)
    .order('relevance_score', { ascending: false })
    .limit(100);

  // Get latest brief
  const { data: latestRun } = await supabase
    .from('pipeline_runs')
    .select('executive_brief')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .single();

  // Get recent trends
  const { data: trends } = await supabase
    .from('trends')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (!articles || articles.length === 0) {
    return new NextResponse('<h1>기사가 없습니다. 파이프라인을 먼저 실행해주세요.</h1>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const date = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  const { subject, preheader } = generateSubjectLine(articles as Article[], date);

  const html = renderNewsletter({
    articles: articles as Article[],
    date,
    executiveBrief: latestRun?.executive_brief || '브리프가 아직 생성되지 않았습니다.',
    trends: (trends || []) as Trend[],
    subjectLine: subject,
    preheaderText: preheader,
  });

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
