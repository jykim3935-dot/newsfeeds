-- ACRYL Intelligence Brief v3 — Database Schema

CREATE TABLE IF NOT EXISTS sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, url text NOT NULL,
  type text NOT NULL CHECK (type IN ('rss','api','websearch','crawl')),
  content_type text NOT NULL CHECK (content_type IN ('news','report','consulting','global','investment','blog','government','research')),
  category text NOT NULL CHECK (category IN ('competitive','market','regulation','tech','customer','investment')),
  enabled boolean NOT NULL DEFAULT true, description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS keyword_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name text NOT NULL,
  category text NOT NULL CHECK (category IN ('competitive','market','regulation','tech','customer','investment')),
  content_types text[] DEFAULT '{}', priority integer NOT NULL CHECK (priority IN (1,2,3)),
  keywords text[] NOT NULL, enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed')),
  started_at timestamptz DEFAULT now(), completed_at timestamptz,
  articles_count integer DEFAULT 0, error text,
  executive_brief text, trend_summary text, metrics jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, url text NOT NULL, source text,
  content_type text NOT NULL CHECK (content_type IN ('news','report','consulting','global','investment','blog','government','research')),
  published_at text, summary text, matched_keywords text[] DEFAULT '{}',
  category text CHECK (category IN ('competitive','market','regulation','tech','customer','investment')),
  relevance_score integer CHECK (relevance_score >= 1 AND relevance_score <= 10),
  urgency text CHECK (urgency IN ('red','yellow','green')),
  impact_comment text, deep_summary text, source_description text,
  key_findings text[] DEFAULT '{}', action_items text[] DEFAULT '{}',
  batch_id uuid REFERENCES pipeline_runs(batch_id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, email text NOT NULL UNIQUE, role text,
  enabled boolean NOT NULL DEFAULT true, created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid, trend_title text NOT NULL, trend_description text NOT NULL,
  related_article_ids uuid[] DEFAULT '{}', category text,
  strength text CHECK (strength IN ('rising','stable','emerging')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS seen_urls (
  url_hash text PRIMARY KEY, url text NOT NULL,
  first_seen_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_articles_batch ON articles(batch_id);
CREATE INDEX IF NOT EXISTS idx_articles_score ON articles(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_articles_urgency ON articles(urgency);
CREATE INDEX IF NOT EXISTS idx_articles_created ON articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trends_batch ON trends(batch_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_status ON pipeline_runs(status);
CREATE INDEX IF NOT EXISTS idx_seen_urls_date ON seen_urls(first_seen_at);

-- Seed Data
INSERT INTO sources (name, url, type, content_type, category) VALUES
  ('전자신문 SW', 'http://rss.etnews.com/04.xml', 'rss', 'news', 'tech'),
  ('전자신문 IT', 'http://rss.etnews.com/03.xml', 'rss', 'news', 'tech'),
  ('전자신문 경제', 'http://rss.etnews.com/02.xml', 'rss', 'news', 'market'),
  ('전자신문 속보', 'http://rss.etnews.com/Section902.xml', 'rss', 'news', 'market'),
  ('ZDNet Korea', 'https://zdnet.co.kr/rss/newsall.xml', 'rss', 'news', 'tech'),
  ('인공지능신문', 'http://www.newstheai.com/rss/allArticle.xml', 'rss', 'news', 'tech'),
  ('디지털타임스', 'http://www.dt.co.kr/rss/all.xml', 'rss', 'news', 'tech'),
  ('매일경제 IT', 'https://www.mk.co.kr/rss/30200030/', 'rss', 'news', 'market'),
  ('한국경제 IT', 'https://www.hankyung.com/feed/it', 'rss', 'news', 'market'),
  ('블로터', 'https://www.bloter.net/feed', 'rss', 'news', 'tech'),
  ('바이라인네트워크', 'https://byline.network/feed/', 'rss', 'news', 'tech'),
  ('TechCrunch AI', 'https://techcrunch.com/category/artificial-intelligence/feed/', 'rss', 'global', 'tech'),
  ('The Verge', 'https://www.theverge.com/rss/index.xml', 'rss', 'global', 'tech'),
  ('VentureBeat AI', 'https://venturebeat.com/category/ai/feed/', 'rss', 'global', 'tech'),
  ('MIT Tech Review', 'https://www.technologyreview.com/feed/', 'rss', 'global', 'tech'),
  ('Hacker News Best', 'https://hnrss.org/best', 'rss', 'blog', 'tech'),
  ('NVIDIA Blog', 'https://blogs.nvidia.com/feed/', 'rss', 'blog', 'tech'),
  ('OpenAI Blog', 'https://openai.com/blog/rss.xml', 'rss', 'blog', 'tech'),
  ('Anthropic News', 'https://www.anthropic.com/rss.xml', 'rss', 'blog', 'tech'),
  ('Hugging Face Blog', 'https://huggingface.co/blog/feed.xml', 'rss', 'blog', 'tech'),
  ('arXiv cs.AI', 'https://rss.arxiv.org/rss/cs.AI', 'rss', 'research', 'tech'),
  ('arXiv cs.DC', 'https://rss.arxiv.org/rss/cs.DC', 'rss', 'research', 'tech'),
  ('arXiv cs.LG', 'https://rss.arxiv.org/rss/cs.LG', 'rss', 'research', 'tech'),
  ('Gartner Newsroom', 'https://www.gartner.com/en/newsroom/rss', 'rss', 'consulting', 'market'),
  ('CB Insights', 'https://www.cbinsights.com/rss/content', 'rss', 'investment', 'investment')
ON CONFLICT DO NOTHING;

INSERT INTO keyword_groups (group_name, category, content_types, priority, keywords) VALUES
  ('ACRYL 제품', 'competitive', '{"news","blog","report"}', 1, '{"ACRYL","아크릴","JONATHAN","GPUBASE","AGENTBASE","FLIGHTBASE","NADIA"}'),
  ('직접 경쟁사', 'competitive', '{"news","investment"}', 1, '{"제논","GenOn","마인즈앤컴퍼니","VESSL AI","Run:ai"}'),
  ('핵심 파트너', 'customer', '{"news","investment"}', 1, '{"KT AI","삼성SDS","메가존클라우드"}'),
  ('GPU 인프라', 'tech', '{"news","blog","research"}', 1, '{"GPU 클라우드","GPU 오케스트레이션","GPU cluster","GPUaaS"}'),
  ('NVIDIA 생태계', 'tech', '{"news","blog","global"}', 1, '{"NVIDIA","엔비디아","Blackwell","H100","B200","GB200"}'),
  ('AI 에이전트', 'tech', '{"news","blog","research"}', 1, '{"AI agent","AI 에이전트","MCP protocol","function calling","agentic AI"}'),
  ('의료 AI', 'tech', '{"news","research","government"}', 2, '{"의료 AI","healthcare AI","SaMD","피부질환 AI","SkinEX"}'),
  ('AI 정책', 'regulation', '{"government","news"}', 2, '{"AI 정책","AI기본법","국가AI위원회","GS인증","혁신제품"}'),
  ('AI 투자', 'investment', '{"news","investment"}', 2, '{"AI 투자","AI IPO","CoreWeave","KOSDAQ AI"}'),
  ('LLM/MLOps', 'tech', '{"news","blog","research"}', 2, '{"LLM","MLOps","model serving","inference optimization","vLLM"}'),
  ('글로벌 AI', 'regulation', '{"global","news"}', 3, '{"AI governance","EU AI Act","AI safety","OECD AI"}'),
  ('글로벌 테크', 'tech', '{"global","blog"}', 3, '{"OpenAI","Anthropic","Google DeepMind","Meta AI","xAI"}')
ON CONFLICT DO NOTHING;

INSERT INTO recipients (name, email, role) VALUES
  ('김종율', 'johnny@acryl.ai', 'BTS 본부장')
ON CONFLICT DO NOTHING;
