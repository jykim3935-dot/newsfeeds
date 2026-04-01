import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/clients/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = getSupabaseAdmin();

  // newsletters 테이블 생성 (RPC로 SQL 직접 실행)
  const { error } = await supabase.rpc('exec_sql', {
    query: `CREATE TABLE IF NOT EXISTS newsletters (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      date text,
      batch_id uuid,
      articles_count integer DEFAULT 0,
      html_content text,
      created_at timestamptz DEFAULT now()
    );`
  });

  // rpc가 없으면 직접 insert로 테이블 존재 확인
  if (error) {
    // 테이블이 이미 있는지 확인
    const { error: checkErr } = await supabase.from('newsletters').select('id').limit(1);
    if (checkErr && checkErr.message.includes('not find')) {
      return NextResponse.json({
        status: 'manual_setup_needed',
        message: 'Supabase SQL Editor에서 아래 SQL을 실행해주세요.',
        sql: `CREATE TABLE IF NOT EXISTS newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  date text,
  batch_id uuid,
  articles_count integer DEFAULT 0,
  html_content text,
  created_at timestamptz DEFAULT now()
);`
      });
    }
    return NextResponse.json({ status: 'ok', message: 'newsletters 테이블이 이미 존재합니다.' });
  }

  return NextResponse.json({ status: 'ok', message: 'newsletters 테이블 생성 완료' });
}
