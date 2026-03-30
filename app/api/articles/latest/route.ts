import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/clients/supabase';

export async function GET() {
  const supabase = getSupabaseAdmin();

  // Get latest completed run
  const { data: latestRun } = await supabase
    .from('pipeline_runs')
    .select('batch_id')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .single();

  if (!latestRun) return NextResponse.json([]);

  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('batch_id', latestRun.batch_id)
    .order('relevance_score', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}
