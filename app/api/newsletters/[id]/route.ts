import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/clients/supabase';

// 뉴스레터 HTML 조회
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('newsletters').select('*').eq('id', id).single();

  if (error || !data) return new NextResponse('뉴스레터를 찾을 수 없습니다.', { status: 404 });

  // HTML로 반환
  return new NextResponse(data.html_content, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// 뉴스레터 삭제
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('newsletters').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
