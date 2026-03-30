import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/clients/supabase';
import { renderNewsletter } from '@/lib/renderers/newsletter';
import { generateSubjectLine } from '@/lib/renderers/subject-line';
import type { Article, Trend } from '@/lib/types';

export async function GET() {
  const supabase = getSupabaseAdmin();

  const { data: latestRun } = await supabase
    .from('pipeline_runs')
    .select('*')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .single();

  if (!latestRun) {
    return new NextResponse('<h1>No completed pipeline run found</h1>', {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  const { data: articles } = await supabase
    .from('articles')
    .select('*')
    .eq('batch_id', latestRun.batch_id)
    .order('relevance_score', { ascending: false });

  const { data: trends } = await supabase
    .from('trends')
    .select('*')
    .eq('batch_id', latestRun.batch_id);

  const date = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  const { subject, preheader } = generateSubjectLine((articles || []) as Article[], date);

  const html = renderNewsletter({
    articles: (articles || []) as Article[],
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
