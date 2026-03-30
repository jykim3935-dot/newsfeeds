import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/clients/supabase';

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const limit = Number(req.nextUrl.searchParams.get('limit') || '100');

  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}
