import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, string> = {};

  // 1. Check env vars
  checks.SUPABASE_URL = process.env.SUPABASE_URL ? 'set' : 'MISSING';
  checks.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING';
  checks.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ? 'set' : 'MISSING';
  checks.RESEND_API_KEY = process.env.RESEND_API_KEY ? 'set' : 'not set (optional)';

  // 2. Check Supabase connection + tables
  if (checks.SUPABASE_URL === 'set' && checks.SUPABASE_SERVICE_ROLE_KEY === 'set') {
    try {
      const { getSupabaseAdmin } = await import('@/lib/clients/supabase');
      const supabase = getSupabaseAdmin();

      const tables = ['pipeline_runs', 'articles', 'sources', 'keyword_groups', 'recipients', 'trends', 'seen_urls'];
      for (const table of tables) {
        const { error } = await supabase.from(table).select('id').limit(1);
        checks[`table:${table}`] = error ? `ERROR: ${error.message}` : 'OK';
      }
    } catch (err) {
      checks.supabase_connection = `ERROR: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  const allOk = Object.values(checks).every((v) => v === 'set' || v === 'OK' || v.includes('optional'));

  return NextResponse.json({ status: allOk ? 'healthy' : 'unhealthy', checks }, { status: allOk ? 200 : 500 });
}
