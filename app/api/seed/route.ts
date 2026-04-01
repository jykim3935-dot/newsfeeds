import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/clients/supabase';

export const dynamic = 'force-dynamic';

const SOURCES = [
  // 국내 뉴스/IT
  { name: '전자신문 SW', url: 'http://rss.etnews.com/04.xml', type: 'rss', content_type: 'news', category: 'tech' },
  { name: '전자신문 IT', url: 'http://rss.etnews.com/03.xml', type: 'rss', content_type: 'news', category: 'tech' },
  { name: '전자신문 경제', url: 'http://rss.etnews.com/02.xml', type: 'rss', content_type: 'news', category: 'market' },
  { name: '전자신문 속보', url: 'http://rss.etnews.com/Section902.xml', type: 'rss', content_type: 'news', category: 'market' },
  { name: 'ZDNet Korea', url: 'https://zdnet.co.kr/rss/newsall.xml', type: 'rss', content_type: 'news', category: 'tech' },
  { name: '인공지능신문', url: 'http://www.newstheai.com/rss/allArticle.xml', type: 'rss', content_type: 'news', category: 'tech' },
  { name: '디지털타임스', url: 'http://www.dt.co.kr/rss/all.xml', type: 'rss', content_type: 'news', category: 'tech' },
  { name: '매일경제 IT', url: 'https://www.mk.co.kr/rss/30200030/', type: 'rss', content_type: 'news', category: 'market' },
  { name: '한국경제 IT', url: 'https://www.hankyung.com/feed/it', type: 'rss', content_type: 'news', category: 'market' },
  { name: '블로터', url: 'https://www.bloter.net/feed', type: 'rss', content_type: 'news', category: 'tech' },
  { name: '바이라인네트워크', url: 'https://byline.network/feed/', type: 'rss', content_type: 'news', category: 'tech' },
  { name: 'AI타임스', url: 'https://www.aitimes.com/rss/allArticle.xml', type: 'rss', content_type: 'news', category: 'tech' },
  { name: 'AI타임스 기업', url: 'https://www.aitimes.com/rss/S1N4.xml', type: 'rss', content_type: 'news', category: 'competitive' },
  { name: '인공지능팩트', url: 'https://www.aifact.co.kr/rss/allArticle.xml', type: 'rss', content_type: 'news', category: 'tech' },
  { name: '테크42', url: 'https://www.tech42.co.kr/rss/allArticle.xml', type: 'rss', content_type: 'news', category: 'tech' },
  { name: '플래텀', url: 'https://platum.kr/feed', type: 'rss', content_type: 'news', category: 'investment' },
  { name: '벤처스퀘어', url: 'https://www.venturesquare.net/feed', type: 'rss', content_type: 'news', category: 'investment' },
  { name: '스타트업투데이', url: 'https://www.startuptoday.kr/rss/allArticle.xml', type: 'rss', content_type: 'news', category: 'investment' },
  { name: '히트뉴스', url: 'https://www.hitnews.co.kr/rss/allArticle.xml', type: 'rss', content_type: 'news', category: 'tech' },
  { name: 'IT조선', url: 'http://it.chosun.com/svc/rss/rss.xml', type: 'rss', content_type: 'news', category: 'tech' },
  { name: '조선비즈 IT', url: 'https://biz.chosun.com/svc/rss/www/it.xml', type: 'rss', content_type: 'news', category: 'tech' },
  { name: '지디넷코리아', url: 'https://www.zdnet.co.kr/rss/newsall.xml', type: 'rss', content_type: 'news', category: 'tech' },
  { name: '테크M', url: 'https://www.techm.kr/rss/allArticle.xml', type: 'rss', content_type: 'news', category: 'tech' },
  { name: '아이뉴스24 IT', url: 'https://www.inews24.com/rss/news_it.xml', type: 'rss', content_type: 'news', category: 'tech' },
  { name: '더밀크', url: 'https://www.themilk.co.kr/feed', type: 'rss', content_type: 'news', category: 'market' },
  { name: '서울경제 IT', url: 'https://www.sedaily.com/RSS/IT', type: 'rss', content_type: 'news', category: 'market' },
  // 종합일간지
  { name: '중앙일보 경제', url: 'https://rss.joins.com/joins_economy_list.xml', type: 'rss', content_type: 'news', category: 'market' },
  { name: '동아일보 IT', url: 'https://rss.donga.com/it.xml', type: 'rss', content_type: 'news', category: 'tech' },
  { name: '한겨레 미래', url: 'https://www.hani.co.kr/rss/science/', type: 'rss', content_type: 'news', category: 'tech' },
  { name: '경향신문 경제', url: 'https://www.khan.co.kr/rss/rssdata/economy_news.xml', type: 'rss', content_type: 'news', category: 'market' },
  // 경제지
  { name: '머니투데이 IT', url: 'https://rss.mt.co.kr/mt/mtview/mt_it.xml', type: 'rss', content_type: 'news', category: 'tech' },
  { name: '머니투데이 경제', url: 'https://rss.mt.co.kr/mt/mtview/mt_stock.xml', type: 'rss', content_type: 'news', category: 'investment' },
  { name: '이데일리 IT', url: 'https://rss.edaily.co.kr/edaily/Industry_IT.xml', type: 'rss', content_type: 'news', category: 'tech' },
  { name: '파이낸셜뉴스 IT', url: 'https://www.fnnews.com/rss/fn_it_index.xml', type: 'rss', content_type: 'news', category: 'tech' },
  { name: '아시아경제 IT', url: 'https://www.asiae.co.kr/rss/all.xml', type: 'rss', content_type: 'news', category: 'market' },
  { name: '헤럴드경제 IT', url: 'http://biz.heraldcorp.com/common/rss.php?ct=010800', type: 'rss', content_type: 'news', category: 'tech' },
  // IT 전문매체 (추가)
  { name: '디지털데일리', url: 'https://www.ddaily.co.kr/rss/S1010001.xml', type: 'rss', content_type: 'news', category: 'tech' },
  { name: '전자신문 AI', url: 'http://rss.etnews.com/Section901.xml', type: 'rss', content_type: 'news', category: 'tech' },
  { name: '데이터넷', url: 'https://www.datanet.co.kr/rss/allArticle.xml', type: 'rss', content_type: 'news', category: 'tech' },
  { name: '컴퓨터월드', url: 'https://www.comworld.co.kr/rss/allArticle.xml', type: 'rss', content_type: 'news', category: 'tech' },
  { name: 'CIO Korea', url: 'https://www.ciokorea.com/rss/', type: 'rss', content_type: 'news', category: 'tech' },
  { name: 'ITWorld Korea', url: 'https://www.itworld.co.kr/rss/', type: 'rss', content_type: 'news', category: 'tech' },
  // 글로벌 Tech/AI
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', type: 'rss', content_type: 'global', category: 'tech' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', type: 'rss', content_type: 'global', category: 'tech' },
  { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/', type: 'rss', content_type: 'global', category: 'tech' },
  { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', type: 'rss', content_type: 'global', category: 'tech' },
  { name: 'Hacker News Best', url: 'https://hnrss.org/best', type: 'rss', content_type: 'blog', category: 'tech' },
  { name: 'NVIDIA Blog', url: 'https://blogs.nvidia.com/feed/', type: 'rss', content_type: 'blog', category: 'tech' },
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', type: 'rss', content_type: 'blog', category: 'tech' },
  { name: 'Anthropic News', url: 'https://www.anthropic.com/rss.xml', type: 'rss', content_type: 'blog', category: 'tech' },
  { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml', type: 'rss', content_type: 'blog', category: 'tech' },
  // 글로벌 주요 매체 (종합)
  { name: 'Reuters Tech', url: 'https://www.reutersagency.com/feed/?taxonomy=best-sectors&post_type=best', type: 'rss', content_type: 'global', category: 'market' },
  { name: 'Bloomberg Tech', url: 'https://feeds.bloomberg.com/technology/news.rss', type: 'rss', content_type: 'global', category: 'market' },
  { name: 'WSJ Tech', url: 'https://feeds.a.dj.com/rss/RSSWSJD.xml', type: 'rss', content_type: 'global', category: 'market' },
  { name: 'Ars Technica AI', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', type: 'rss', content_type: 'global', category: 'tech' },
  { name: 'Wired AI', url: 'https://www.wired.com/feed/tag/ai/latest/rss', type: 'rss', content_type: 'global', category: 'tech' },
  { name: 'The Information', url: 'https://www.theinformation.com/feed', type: 'rss', content_type: 'global', category: 'investment' },
  { name: 'Financial Times Tech', url: 'https://www.ft.com/technology?format=rss', type: 'rss', content_type: 'global', category: 'market' },
  { name: 'CNBC Tech', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=19854910', type: 'rss', content_type: 'global', category: 'market' },
  { name: 'The Economist', url: 'https://www.economist.com/science-and-technology/rss.xml', type: 'rss', content_type: 'global', category: 'market' },
  { name: 'Nikkei Asia Tech', url: 'https://asia.nikkei.com/rss/feed/nar', type: 'rss', content_type: 'global', category: 'market' },
  // 투자/VC/스타트업
  { name: 'Crunchbase News', url: 'https://news.crunchbase.com/feed/', type: 'rss', content_type: 'investment', category: 'investment' },
  { name: 'a16z Blog', url: 'https://a16z.com/feed/', type: 'rss', content_type: 'blog', category: 'investment' },
  { name: 'Sequoia Blog', url: 'https://www.sequoiacap.com/feed/', type: 'rss', content_type: 'blog', category: 'investment' },
  { name: 'PitchBook News', url: 'https://pitchbook.com/news/feed', type: 'rss', content_type: 'investment', category: 'investment' },
  // AI 헬스케어/의료/바이오
  { name: 'Healthcare IT News', url: 'https://www.healthcareitnews.com/feed', type: 'rss', content_type: 'news', category: 'tech' },
  { name: 'Fierce Healthcare', url: 'https://www.fiercehealthcare.com/rss/xml', type: 'rss', content_type: 'news', category: 'tech' },
  { name: 'STAT News', url: 'https://www.statnews.com/feed/', type: 'rss', content_type: 'news', category: 'tech' },
  { name: 'Nature Digital Medicine', url: 'https://www.nature.com/npjdigitalmed.rss', type: 'rss', content_type: 'research', category: 'tech' },
  { name: '메디게이트뉴스', url: 'https://www.medigatenews.com/rss', type: 'rss', content_type: 'news', category: 'tech' },
  { name: '히트뉴스 의료', url: 'https://www.hitnews.co.kr/rss/S1N8.xml', type: 'rss', content_type: 'news', category: 'tech' },
  { name: '청년의사', url: 'https://www.docdocdoc.co.kr/rss/allArticle.xml', type: 'rss', content_type: 'news', category: 'tech' },
  { name: '메디칼타임즈', url: 'https://www.medicaltimes.com/rss/allArticle.xml', type: 'rss', content_type: 'news', category: 'tech' },
  { name: '바이오스펙테이터', url: 'https://www.biospectator.com/rss/allArticle.xml', type: 'rss', content_type: 'news', category: 'investment' },
  { name: '팜뉴스', url: 'https://www.pharmnews.com/rss/allArticle.xml', type: 'rss', content_type: 'news', category: 'tech' },
  { name: 'Fierce Biotech', url: 'https://www.fiercebiotech.com/rss/xml', type: 'rss', content_type: 'global', category: 'investment' },
  { name: 'Endpoints News', url: 'https://endpts.com/feed/', type: 'rss', content_type: 'global', category: 'investment' },
  { name: 'MobiHealthNews', url: 'https://www.mobihealthnews.com/feed', type: 'rss', content_type: 'global', category: 'tech' },
  // 리서치
  { name: 'arXiv cs.AI', url: 'https://rss.arxiv.org/rss/cs.AI', type: 'rss', content_type: 'research', category: 'tech' },
  { name: 'arXiv cs.DC', url: 'https://rss.arxiv.org/rss/cs.DC', type: 'rss', content_type: 'research', category: 'tech' },
  { name: 'arXiv cs.LG', url: 'https://rss.arxiv.org/rss/cs.LG', type: 'rss', content_type: 'research', category: 'tech' },
  // 컨설팅/시장조사
  { name: 'Gartner Newsroom', url: 'https://www.gartner.com/en/newsroom/rss', type: 'rss', content_type: 'consulting', category: 'market' },
  { name: 'CB Insights', url: 'https://www.cbinsights.com/rss/content', type: 'rss', content_type: 'investment', category: 'investment' },
  { name: 'McKinsey Insights', url: 'https://www.mckinsey.com/insights/rss', type: 'rss', content_type: 'consulting', category: 'market' },
  // 투자/정부
  { name: 'DART', url: 'https://opendart.fss.or.kr', type: 'api', content_type: 'investment', category: 'investment' },
  { name: '과학기술정보통신부', url: 'https://www.msit.go.kr', type: 'websearch', content_type: 'government', category: 'regulation' },
  { name: 'IITP', url: 'https://www.iitp.kr', type: 'websearch', content_type: 'government', category: 'regulation' },
];

const KEYWORDS = [
  // Priority 1 (핵심)
  { group_name: 'ACRYL 제품', category: 'competitive', content_types: ['news', 'blog', 'report'], priority: 1, keywords: ['ACRYL', '아크릴', 'JONATHAN', 'GPUBASE', 'AGENTBASE', 'FLIGHTBASE', 'NADIA'] },
  { group_name: '경쟁사-GenOn', category: 'competitive', content_types: ['news', 'investment'], priority: 1, keywords: ['GenOn AI', '마인즈앤컴퍼니', '제논데이타', '제논 AI'] },
  { group_name: '경쟁사-래블업', category: 'competitive', content_types: ['news', 'investment'], priority: 1, keywords: ['래블업', 'Lablup', 'Backend.AI'] },
  { group_name: '경쟁사-마키나락스', category: 'competitive', content_types: ['news', 'investment'], priority: 1, keywords: ['마키나락스', 'MakinaRocks', 'Makinarocks AI'] },
  { group_name: '경쟁사-VESSL/Run:ai', category: 'competitive', content_types: ['news', 'investment'], priority: 1, keywords: ['VESSL AI', 'Run:ai', 'Run.ai'] },
  { group_name: '경쟁사-AI칩', category: 'competitive', content_types: ['news', 'investment'], priority: 1, keywords: ['리벨리온 AI', 'Rebellions', '퓨리오사AI', 'FuriosaAI'] },
  { group_name: '핵심 파트너', category: 'customer', content_types: ['news', 'investment'], priority: 1, keywords: ['KT AI', '삼성SDS', '메가존클라우드'] },
  { group_name: 'GPU 인프라', category: 'tech', content_types: ['news', 'blog', 'research'], priority: 1, keywords: ['GPU 클라우드', 'GPU 오케스트레이션', 'GPU cluster', 'GPUaaS'] },
  { group_name: 'NVIDIA 생태계', category: 'tech', content_types: ['news', 'blog', 'global'], priority: 1, keywords: ['NVIDIA', '엔비디아', 'Blackwell', 'H100', 'B200', 'GB200'] },
  { group_name: 'AI 에이전트', category: 'tech', content_types: ['news', 'blog', 'research'], priority: 1, keywords: ['AI agent', 'AI 에이전트', 'MCP protocol', 'function calling', 'agentic AI'] },
  // Priority 2 (중요)
  { group_name: '의료 AI/디지털헬스', category: 'tech', content_types: ['news', 'research', 'government'], priority: 1, keywords: ['의료 AI', 'healthcare AI', 'SaMD', 'medical AI', 'digital therapeutics', '디지털치료제', 'AI 진단', '의료데이터', '의료 빅데이터'] },
  { group_name: '바이오/제약 AI', category: 'tech', content_types: ['news', 'research', 'investment'], priority: 1, keywords: ['바이오 AI', 'AI 신약', 'drug discovery AI', '바이오마커', 'AI 임상', '정밀의료', 'precision medicine'] },
  { group_name: '의료AI 기업', category: 'competitive', content_types: ['news', 'investment'], priority: 1, keywords: ['뷰노', 'Lunit', '루닛', '딥노이드', '제이엘케이', 'JLK', '셀바스AI', '피부질환 AI', 'SkinEX', 'NADIA'] },
  { group_name: 'AI 정책', category: 'regulation', content_types: ['government', 'news'], priority: 2, keywords: ['AI 정책', 'AI기본법', '국가AI위원회', 'GS인증', '혁신제품', 'AI 윤리', 'AI 규제'] },
  { group_name: 'AI 투자', category: 'investment', content_types: ['news', 'investment'], priority: 2, keywords: ['AI 투자', 'AI IPO', 'CoreWeave', 'KOSDAQ AI', 'AI 펀드', 'AI M&A', 'AI 밸류에이션', 'GPU as a Service', 'AI infra funding'] },
  { group_name: 'AI VC/스타트업 딜', category: 'investment', content_types: ['news', 'investment', 'global'], priority: 2, keywords: ['AI funding', 'Series A', 'Series B', 'AI startup', 'AI unicorn', 'AI acquisition', 'a16z AI', 'Sequoia AI'] },
  { group_name: 'LLM/MLOps', category: 'tech', content_types: ['news', 'blog', 'research'], priority: 2, keywords: ['LLM', 'MLOps', 'model serving', 'inference optimization', 'vLLM'] },
  { group_name: 'AI 반도체/칩', category: 'tech', content_types: ['news', 'blog', 'global'], priority: 2, keywords: ['AI 반도체', 'AI chip', 'NPU', 'AI accelerator', '리벨리온', '퓨리오사', 'Groq', 'Cerebras'] },
  { group_name: 'AI 클라우드/인프라 기업', category: 'competitive', content_types: ['news', 'investment'], priority: 1, keywords: ['래블업', 'Lablup', 'Backend.AI', '노타', 'Nota AI', '마키나락스', 'MakinaRocks', 'CoreWeave', 'Lambda Labs', 'Together AI'] },
  // Priority 3 (참고)
  { group_name: '글로벌 AI', category: 'regulation', content_types: ['global', 'news'], priority: 3, keywords: ['AI governance', 'EU AI Act', 'AI safety', 'OECD AI'] },
  { group_name: '글로벌 테크', category: 'tech', content_types: ['global', 'blog'], priority: 3, keywords: ['OpenAI', 'Anthropic', 'Google DeepMind', 'Meta AI', 'xAI'] },
  { group_name: '국내 AI 스타트업', category: 'competitive', content_types: ['news', 'investment'], priority: 2, keywords: ['업스테이지', 'Upstage', '튜닙', 'Tunib', '뤼튼', 'Wrtn', '카카오브레인', '네이버클라우드', 'CLOVA', 'HyperCLOVA'] },
];

export async function GET() {
  const supabase = getSupabaseAdmin();
  const results: Record<string, string> = {};

  // Clear old articles, trends, pipeline runs (fresh start)
  await supabase.from('trends').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('articles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('pipeline_runs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  results.cleanup = 'articles, trends, pipeline_runs cleared';

  // Clear existing and re-insert sources
  await supabase.from('sources').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { data: srcData, error: srcErr } = await supabase.from('sources').insert(SOURCES).select();
  results.sources = srcErr ? `ERROR: ${srcErr.message}` : `${srcData?.length || 0} sources inserted`;

  // Clear existing and re-insert keywords
  await supabase.from('keyword_groups').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { data: kwData, error: kwErr } = await supabase.from('keyword_groups').insert(KEYWORDS).select();
  results.keywords = kwErr ? `ERROR: ${kwErr.message}` : `${kwData?.length || 0} keyword groups inserted`;

  // Clear seen_urls so next pipeline run collects fresh articles
  const { count } = await supabase.from('seen_urls').delete({ count: 'exact' }).neq('url_hash', '');
  results.seen_urls = `Cleared ${count || 0} entries`;

  return NextResponse.json(results);
}
