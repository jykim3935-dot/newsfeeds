import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/clients/supabase';
import { renderNewsletter } from '@/lib/renderers/newsletter';
import { generateSubjectLine } from '@/lib/renderers/subject-line';
import type { Article, Trend } from '@/lib/types';

export async function GET() {
  const supabase = getSupabaseAdmin();

  // Get latest completed run
  const { data: latestRun } = await supabase
    .from('pipeline_runs')
    .select('*')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .single();

  if (!latestRun) {
    return new NextResponse('<h1>파이프라인을 먼저 실행해주세요.</h1>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Get articles from this batch
  const { data: batchArticles } = await supabase
    .from('articles')
    .select('*')
    .eq('batch_id', latestRun.batch_id)
    .order('relevance_score', { ascending: false });

  const articles = (batchArticles || []) as Article[];

  if (articles.length === 0) {
    return new NextResponse('<h1>이 배치에 기사가 없습니다.</h1>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Get trends from this batch
  const { data: trends } = await supabase
    .from('trends')
    .select('*')
    .eq('batch_id', latestRun.batch_id);

  const date = new Date(latestRun.completed_at || latestRun.started_at).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  const { subject, preheader } = generateSubjectLine(articles, date);

  const html = renderNewsletter({
    articles,
    date,
    executiveBrief: latestRun.executive_brief || '',
    trends: (trends || []) as Trend[],
    subjectLine: subject,
    preheaderText: preheader,
  });

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
