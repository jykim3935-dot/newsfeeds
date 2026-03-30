import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/clients/supabase';

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const supabase = getSupabaseAdmin();

  let query = supabase.from('articles').select('*').order('relevance_score', { ascending: false }).limit(50);

  const batchId = params.get('batch_id');
  if (batchId) query = query.eq('batch_id', batchId);

  const contentType = params.get('content_type');
  if (contentType) query = query.eq('content_type', contentType);

  const urgency = params.get('urgency');
  if (urgency) query = query.eq('urgency', urgency);

  const category = params.get('category');
  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
