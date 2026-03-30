import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/clients/supabase';
import { renderNewsletter } from '@/lib/renderers/newsletter';
import { generateSubjectLine } from '@/lib/renderers/subject-line';
import { sendEmail } from '@/lib/clients/resend';
import type { Article, Trend } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = body.email;
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

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
      return NextResponse.json({ error: '파이프라인을 먼저 실행해주세요.' }, { status: 400 });
    }

    const { data: articles } = await supabase
      .from('articles').select('*')
      .eq('batch_id', latestRun.batch_id)
      .order('relevance_score', { ascending: false });

    if (!articles || articles.length === 0) {
      return NextResponse.json({ error: '발송할 기사가 없습니다.' }, { status: 400 });
    }

    const { data: trends } = await supabase
      .from('trends').select('*')
      .eq('batch_id', latestRun.batch_id);

    const date = new Date(latestRun.completed_at || latestRun.started_at).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    });

    const { subject, preheader } = generateSubjectLine(articles as Article[], date);

    const html = renderNewsletter({
      articles: articles as Article[],
      date,
      executiveBrief: latestRun.executive_brief || '',
      trends: (trends || []) as Trend[],
      subjectLine: subject,
      preheaderText: preheader,
    });

    const result = await sendEmail({ to: [email], subject, html });
    if (result.success) {
      return NextResponse.json({ ok: true, message: `${email}로 발송 완료 (${articles.length}건)` });
    }
    return NextResponse.json({ error: `발송 실패: ${result.error}` }, { status: 500 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
