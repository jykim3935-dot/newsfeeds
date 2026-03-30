export const CONTENT_TYPES = [
  'news','report','consulting','global','investment','blog','government','research'
] as const;
export type ContentType = typeof CONTENT_TYPES[number];

export const CATEGORIES = [
  'competitive','market','regulation','tech','customer','investment'
] as const;
export type Category = typeof CATEGORIES[number];

export type Urgency = 'red' | 'yellow' | 'green';
export type SourceType = 'rss' | 'api' | 'websearch' | 'crawl';
export type TrendStrength = 'rising' | 'stable' | 'emerging';
export type PipelineStatus = 'running' | 'completed' | 'failed';
export type ModelTier = 'fast' | 'smart';

export interface Source {
  id: string;
  name: string;
  url: string;
  type: SourceType;
  content_type: ContentType;
  category: Category;
  enabled: boolean;
  description: string | null;
  created_at: string;
}

export interface KeywordGroup {
  id: string;
  group_name: string;
  category: Category;
  content_types: ContentType[];
  priority: 1 | 2 | 3;
  keywords: string[];
  enabled: boolean;
  created_at: string;
}

export interface Article {
  id: string;
  title: string;
  url: string;
  source: string | null;
  content_type: ContentType;
  published_at: string | null;
  summary: string | null;
  matched_keywords: string[];
  category: Category | null;
  relevance_score: number | null;
  urgency: Urgency | null;
  impact_comment: string | null;
  deep_summary: string | null;
  source_description: string | null;
  key_findings: string[];
  action_items: string[];
  batch_id: string | null;
  created_at: string;
}

export interface Recipient {
  id: string;
  name: string;
  email: string;
  role: string | null;
  enabled: boolean;
  created_at: string;
}

export interface PipelineRun {
  id: string;
  batch_id: string;
  status: PipelineStatus;
  started_at: string;
  completed_at: string | null;
  articles_count: number;
  error: string | null;
  executive_brief: string | null;
  trend_summary: string | null;
  metrics: PipelineMetrics;
  created_at: string;
}

export interface Trend {
  id: string;
  batch_id: string | null;
  trend_title: string;
  trend_description: string;
  related_article_ids: string[];
  category: string | null;
  strength: TrendStrength;
  created_at: string;
}

export interface CollectedArticle {
  title: string;
  url: string;
  source: string;
  content_type: ContentType;
  published_at: string | null;
  summary: string | null;
  matched_keywords: string[];
  batch_id: string;
}

export interface PipelineResult {
  batchId: string;
  articlesCount: number;
  deepCuratedCount: number;
  trendsCount: number;
  sent: number;
  errors: string[];
  warnings: string[];
  status: PipelineStatus;
  metrics: PipelineMetrics;
}

export interface PipelineMetrics {
  duration_ms: number;
  collectors: Record<string, { count: number; duration_ms: number; errors: string[] }>;
  curation: {
    basic: { processed: number; api_calls: number };
    deep: { processed: number; api_calls: number };
  };
  tokens: { input_total: number; output_total: number };
  estimated_cost_usd: number;
  sending: { total: number; sent: number; failed: number };
}

export interface CallClaudeResult {
  message: import('@anthropic-ai/sdk').Anthropic.Message;
  tokensIn: number;
  tokensOut: number;
  durationMs: number;
  model: string;
}

export interface NewsletterData {
  articles: Article[];
  date: string;
  executiveBrief: string;
  trends: Trend[];
  subjectLine: string;
  preheaderText: string;
}
