import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/clients/supabase';
import { runPipeline } from '@/lib/pipeline';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = getSupabaseAdmin();
  const log: string[] = [];

  // 1. DB 전체 초기화
  await supabase.from('trends').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('articles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('pipeline_runs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('seen_urls').delete().neq('url_hash', '');
  log.push('DB cleared: articles, trends, pipeline_runs, seen_urls');

  // 2. 파이프라인 실행
  try {
    const result = await runPipeline();
    log.push(`Pipeline: ${result.articlesCount} articles, status=${result.status}`);
    if (result.warnings.length > 0) log.push(`Warnings: ${result.warnings.join('; ')}`);
    return NextResponse.json({ ok: true, log, result });
  } catch (err) {
    log.push(`Pipeline failed: ${err instanceof Error ? err.message : String(err)}`);
    return NextResponse.json({ ok: false, log }, { status: 500 });
  }
}
