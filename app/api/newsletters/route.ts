import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/clients/supabase';
import { renderNewsletter } from '@/lib/renderers/newsletter';
import { generateSubjectLine } from '@/lib/renderers/subject-line';
import type { Article, Trend } from '@/lib/types';

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('newsletters')
    .select('id, title, date, articles_count, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

// 현재 최신 배치를 뉴스레터로 저장
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const body = await req.json().catch(() => ({}));

  // batch_id가 주어지면 해당 배치, 아니면 최신 배치
  let batchId = body.batch_id;
  if (!batchId) {
    const { data: run } = await supabase.from('pipeline_runs').select('batch_id, completed_at')
      .eq('status', 'completed').order('completed_at', { ascending: false }).limit(1).single();
    if (!run) return NextResponse.json({ error: '완료된 파이프라인이 없습니다.' }, { status: 400 });
    batchId = run.batch_id;
  }

  const { data: articles } = await supabase.from('articles').select('*')
    .eq('batch_id', batchId).order('relevance_score', { ascending: false });

  const { data: runData } = await supabase.from('pipeline_runs').select('executive_brief')
    .eq('batch_id', batchId).single();

  const { data: trends } = await supabase.from('trends').select('*').eq('batch_id', batchId);

  const arts = (articles || []) as Article[];
  if (arts.length === 0) return NextResponse.json({ error: '기사가 없습니다.' }, { status: 400 });

  const date = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });
  const { subject } = generateSubjectLine(arts, date);
  const html = renderNewsletter({
    articles: arts, date, executiveBrief: runData?.executive_brief || '',
    trends: (trends || []) as Trend[], subjectLine: subject, preheaderText: '',
  });

  const title = body.title || subject;

  const { data: saved, error: saveErr } = await supabase.from('newsletters').insert({
    title, date, batch_id: batchId, articles_count: arts.length, html_content: html,
  }).select().single();

  if (saveErr) return NextResponse.json({ error: saveErr.message }, { status: 500 });
  return NextResponse.json(saved, { status: 201 });
}
