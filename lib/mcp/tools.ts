import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getSupabaseAdmin } from '@/lib/clients/supabase';

export function registerTools(server: McpServer) {
  server.tool(
    'search_articles',
    'ACRYL Intelligence Brief에서 키워드/카테고리/긴급도로 기사를 검색합니다.',
    {
      query: z.string().optional().describe('검색 키워드'),
      category: z.enum(['competitive', 'market', 'regulation', 'tech', 'customer', 'investment']).optional(),
      urgency: z.enum(['red', 'yellow', 'green']).optional(),
      days: z.number().default(7).describe('최근 N일'),
      limit: z.number().default(10).describe('최대 결과 수'),
    },
    async ({ query, category, urgency, days, limit }: { query?: string; category?: string; urgency?: string; days: number; limit: number }) => {
      const supabase = getSupabaseAdmin();
      let q = supabase.from('articles').select('*')
        .order('relevance_score', { ascending: false })
        .limit(limit)
        .gte('created_at', new Date(Date.now() - days * 86400000).toISOString());
      if (query) q = q.or(`title.ilike.%${query}%,summary.ilike.%${query}%`);
      if (category) q = q.eq('category', category);
      if (urgency) q = q.eq('urgency', urgency);
      const { data } = await q;
      return { content: [{ type: 'text' as const, text: JSON.stringify(data || [], null, 2) }] };
    }
  );

  server.tool(
    'get_latest_brief',
    '최신 Executive Brief를 조회합니다.',
    {},
    async () => {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from('pipeline_runs')
        .select('executive_brief, completed_at, articles_count, metrics')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();
      return { content: [{ type: 'text' as const, text: JSON.stringify(data || { message: 'No brief found' }, null, 2) }] };
    }
  );

  server.tool(
    'get_trends',
    '최근 트렌드를 조회합니다.',
    { days: z.number().default(7).describe('최근 N일') },
    async ({ days }: { days: number }) => {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from('trends')
        .select('*')
        .gte('created_at', new Date(Date.now() - days * 86400000).toISOString())
        .order('created_at', { ascending: false });
      return { content: [{ type: 'text' as const, text: JSON.stringify(data || [], null, 2) }] };
    }
  );

  server.tool(
    'get_article_detail',
    '기사 상세 정보를 조회합니다 (deep_summary 포함).',
    { article_id: z.string().describe('기사 UUID') },
    async ({ article_id }: { article_id: string }) => {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from('articles')
        .select('*')
        .eq('id', article_id)
        .single();
      return { content: [{ type: 'text' as const, text: JSON.stringify(data || { error: 'Not found' }, null, 2) }] };
    }
  );

  server.tool(
    'get_action_items',
    '최근 액션 아이템을 집계합니다.',
    { days: z.number().default(7).describe('최근 N일') },
    async ({ days }: { days: number }) => {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from('articles')
        .select('title, url, urgency, action_items, category')
        .gte('created_at', new Date(Date.now() - days * 86400000).toISOString())
        .not('action_items', 'eq', '{}')
        .order('relevance_score', { ascending: false });
      return { content: [{ type: 'text' as const, text: JSON.stringify(data || [], null, 2) }] };
    }
  );

  server.tool(
    'get_competitors',
    '경쟁사 관련 기사를 모아봅니다.',
    {
      company: z.string().optional().describe('경쟁사명'),
      days: z.number().default(7),
    },
    async ({ company, days }: { company?: string; days: number }) => {
      const supabase = getSupabaseAdmin();
      let q = supabase.from('articles').select('*')
        .eq('category', 'competitive')
        .gte('created_at', new Date(Date.now() - days * 86400000).toISOString())
        .order('relevance_score', { ascending: false });
      if (company) q = q.or(`title.ilike.%${company}%,summary.ilike.%${company}%`);
      const { data } = await q;
      return { content: [{ type: 'text' as const, text: JSON.stringify(data || [], null, 2) }] };
    }
  );

  server.tool(
    'trigger_pipeline',
    '뉴스레터 파이프라인을 수동 실행합니다.',
    { test_email: z.string().optional().describe('테스트 수신 이메일') },
    async ({ test_email }: { test_email?: string }) => {
      const { runPipeline } = await import('@/lib/pipeline');
      const result = await runPipeline(test_email);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_pipeline_status',
    '최근 파이프라인 실행 상태와 비용을 조회합니다.',
    {},
    async () => {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from('pipeline_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      return { content: [{ type: 'text' as const, text: JSON.stringify(data || [], null, 2) }] };
    }
  );
}
