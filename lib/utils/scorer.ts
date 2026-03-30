import type { CollectedArticle, Category, Urgency } from '@/lib/types';

interface ScoringResult {
  relevance_score: number;
  urgency: Urgency;
  category: Category;
  impact_comment: string;
}

// 우선순위별 키워드 + 점수
const SCORING_RULES: Array<{ keywords: string[]; score: number; urgency: Urgency; category: Category; label: string }> = [
  // P0: ACRYL 직접 관련 (9-10점, red)
  { keywords: ['ACRYL', '아크릴', 'JONATHAN', 'GPUBASE', 'AGENTBASE', 'FLIGHTBASE', 'NADIA'], score: 10, urgency: 'red', category: 'competitive', label: 'ACRYL 직접 관련' },

  // P1: 직접 경쟁사 (8-9점, red)
  { keywords: ['제논', 'GenOn', '마인즈앤컴퍼니', 'VESSL AI', 'Run:ai', 'Run.ai', '래블업', 'Lablup', 'Backend.AI', '노타', 'Nota AI', '마키나락스', 'MakinaRocks'], score: 9, urgency: 'red', category: 'competitive', label: '직접 경쟁사 동향' },

  // P2: GPU/AI 인프라 경쟁 (8점, red)
  { keywords: ['CoreWeave', 'Lambda Labs', 'Together AI', '모레', 'Moreh', '리벨리온', 'Rebellions', '퓨리오사', 'FuriosaAI'], score: 8, urgency: 'red', category: 'competitive', label: 'AI 인프라 경쟁사' },

  // P3: 핵심 파트너/고객 (8점, yellow)
  { keywords: ['KT AI', '삼성SDS', '메가존클라우드', '강원랜드', 'KODATA', '한국가스기술공사', '아산병원'], score: 8, urgency: 'yellow', category: 'customer', label: '파트너/고객 동향' },

  // P4: GPU/AI 인프라 핵심 (7-8점, yellow)
  { keywords: ['GPU 클라우드', 'GPU 오케스트레이션', 'GPU cluster', 'GPUaaS', 'GPU as a Service', 'NVIDIA', '엔비디아', 'Blackwell', 'H100', 'B200', 'GB200'], score: 8, urgency: 'yellow', category: 'tech', label: 'GPU/AI 인프라' },

  // P5: AI 에이전트/MCP (7점, yellow)
  { keywords: ['AI agent', 'AI 에이전트', 'MCP protocol', 'MCP 프로토콜', 'function calling', 'agentic AI', 'tool use'], score: 7, urgency: 'yellow', category: 'tech', label: 'AI 에이전트/MCP' },

  // P6: 의료 AI (7점, yellow)
  { keywords: ['의료 AI', 'healthcare AI', 'medical AI', 'SaMD', '디지털치료제', 'digital therapeutics', 'AI 진단', 'FDA AI', '뷰노', 'Lunit', '루닛', '피부질환', 'SkinEX'], score: 7, urgency: 'yellow', category: 'tech', label: '의료 AI 동향' },

  // P7: AI 투자/M&A (7점, yellow)
  { keywords: ['AI 투자', 'AI IPO', 'AI M&A', 'AI funding', 'AI unicorn', 'KOSDAQ AI', 'AI 밸류에이션'], score: 7, urgency: 'yellow', category: 'investment', label: 'AI 투자/M&A' },

  // P8: AI 정책/규제 (6점, yellow)
  { keywords: ['AI 정책', 'AI기본법', '국가AI위원회', 'GS인증', '혁신제품', 'AI 규제', 'AI 윤리'], score: 6, urgency: 'yellow', category: 'regulation', label: 'AI 정책/규제' },

  // P9: MLOps/LLM (6점, green)
  { keywords: ['MLOps', 'model serving', 'inference optimization', 'vLLM', 'LLM 서빙', 'AI 플랫폼'], score: 6, urgency: 'green', category: 'tech', label: 'MLOps/LLM 기술' },

  // P10: 국내 AI 스타트업 (6점, green)
  { keywords: ['업스테이지', 'Upstage', '뤼튼', 'Wrtn', '카카오브레인', '네이버클라우드', 'HyperCLOVA'], score: 6, urgency: 'green', category: 'competitive', label: '국내 AI 스타트업' },

  // P11: 글로벌 빅테크 AI (5점, green)
  { keywords: ['OpenAI', 'Anthropic', 'Google DeepMind', 'Meta AI', 'xAI', 'Microsoft AI', 'Amazon Bedrock'], score: 5, urgency: 'green', category: 'tech', label: '글로벌 AI 동향' },
];

export function scoreArticle(article: CollectedArticle): ScoringResult {
  const text = `${article.title} ${article.summary || ''} ${article.source}`.toLowerCase();

  let bestScore = 3;
  let bestUrgency: Urgency = 'green';
  let bestCategory: Category = 'tech';
  let bestLabel = '일반 기술 뉴스';

  for (const rule of SCORING_RULES) {
    for (const keyword of rule.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        if (rule.score > bestScore) {
          bestScore = rule.score;
          bestUrgency = rule.urgency;
          bestCategory = rule.category;
          bestLabel = rule.label;
        }
        break;
      }
    }
  }

  // 추가 점수 부스트: 여러 규칙에 매칭되면 +1
  let matchCount = 0;
  for (const rule of SCORING_RULES) {
    for (const keyword of rule.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        matchCount++;
        break;
      }
    }
  }
  if (matchCount >= 3) bestScore = Math.min(10, bestScore + 1);
  if (matchCount >= 2 && bestUrgency === 'green') bestUrgency = 'yellow';

  return {
    relevance_score: bestScore,
    urgency: bestUrgency,
    category: bestCategory,
    impact_comment: bestLabel,
  };
}
