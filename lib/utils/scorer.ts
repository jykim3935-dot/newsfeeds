import type { CollectedArticle, Category, Urgency } from '@/lib/types';

export interface ScoringResult {
  relevance_score: number;
  urgency: Urgency;
  category: Category;
  impact_comment: string;
  is_acryl_mention: boolean; // 자사 언급 여부 (별도 섹션용)
}

// ACRYL 자사 판별 키워드 (대소문자 구분)
const ACRYL_KEYWORDS_EXACT = ['ACRYL', 'GPUBASE', 'AGENTBASE', 'FLIGHTBASE'];
const ACRYL_KEYWORDS_LOWER = ['아크릴', 'jonathan 플랫폼', 'nadia 피부질환', '아크릴 주가'];

function isAcrylMention(title: string, summary: string): boolean {
  const raw = `${title} ${summary}`;
  const lower = raw.toLowerCase();
  for (const kw of ACRYL_KEYWORDS_EXACT) {
    if (raw.includes(kw)) return true;
  }
  for (const kw of ACRYL_KEYWORDS_LOWER) {
    if (lower.includes(kw)) return true;
  }
  return false;
}

// 외부 인텔리전스 스코어링 규칙 (ACRYL 사업에 도움되는 외부 정보)
const SCORING_RULES: Array<{
  keywords: string[];
  caseSensitive?: boolean;
  score: number;
  urgency: Urgency;
  category: Category;
  label: string;
}> = [
  // 직접 경쟁사 (8점, yellow) — "제논" 단독은 동음이의어 많아서 제외
  { keywords: ['제논 AI', 'GenOn', '마인즈앤컴퍼니', '제논데이타'], score: 8, urgency: 'yellow', category: 'competitive', label: '직접 경쟁사 동향' },
  { keywords: ['Run:ai', 'Run.ai'], score: 8, urgency: 'yellow', category: 'competitive', label: 'GPU 오케스트레이션 글로벌 경쟁사' },

  // GPU 인프라 시장 (8점, yellow)
  { keywords: ['GPU 클라우드', 'GPU 오케스트레이션', 'GPU cluster', 'GPUaaS', 'GPU as a Service'], score: 8, urgency: 'yellow', category: 'market', label: 'GPU 인프라 시장 변화' },
  // AI 인프라 경쟁사 (8점, yellow)
  { keywords: ['래블업', 'Lablup', 'Backend.AI', '노타', 'Nota AI', '마키나락스', 'MakinaRocks', 'CoreWeave'], score: 8, urgency: 'yellow', category: 'competitive', label: 'AI 인프라 경쟁 동향' },
  // 파트너사 (8점, yellow)
  { keywords: ['KT AI', '삼성SDS', '메가존클라우드'], score: 8, urgency: 'yellow', category: 'customer', label: '파트너사 동향 — 협업 기회' },

  // AI 에이전트/MCP (7점, yellow)
  { keywords: ['AI 에이전트', 'AI agent', 'MCP protocol', 'agentic AI'], score: 7, urgency: 'yellow', category: 'tech', label: 'AI 에이전트 — AGENTBASE 시장' },
  // 의료 AI (7점, yellow)
  { keywords: ['의료 AI', 'healthcare AI', 'medical AI', 'SaMD', '디지털치료제', 'AI 진단', '뷰노', '루닛', 'Lunit'], score: 7, urgency: 'yellow', category: 'tech', label: '의료 AI — NADIA 시장' },
  // 공공 AI (7점, yellow)
  { keywords: ['공공 AI', 'AI 조달', '나라장터', 'AI 데이터센터'], score: 7, urgency: 'yellow', category: 'regulation', label: '공공 AI 사업 기회' },
  // AI 투자 (7점, yellow)
  { keywords: ['AI 투자', 'AI IPO', 'AI M&A', 'KOSDAQ AI'], score: 7, urgency: 'yellow', category: 'investment', label: 'AI 투자/M&A — IR 참고' },

  // NVIDIA (6점, green)
  { keywords: ['NVIDIA', '엔비디아', 'H100', 'B200', 'Blackwell'], score: 6, urgency: 'green', category: 'tech', label: 'NVIDIA — GPU 공급망' },
  // MLOps (6점, green)
  { keywords: ['MLOps', 'model serving', 'inference optimization', 'vLLM'], score: 6, urgency: 'green', category: 'tech', label: 'MLOps — FLIGHTBASE 참고' },
  // AI 정책 (6점, green)
  { keywords: ['AI 정책', 'AI기본법', 'GS인증', '혁신제품'], score: 6, urgency: 'green', category: 'regulation', label: 'AI 정책/규제' },
  // AI 반도체 (5점, green)
  { keywords: ['리벨리온', 'Rebellions', '퓨리오사', 'Groq', 'Cerebras'], score: 5, urgency: 'green', category: 'tech', label: 'AI 반도체 동향' },
];

const IRRELEVANT_PATTERNS = [
  '맛집', '여행', '연예', '스포츠', '날씨', '부동산', '주식 추천',
  'ChatGPT 사용법', 'AI 그림', 'AI 음악', 'AI 작곡',
  '세미나 안내', '워크숍 개최', 'obituary', 'funeral',
  'marine patrol', 'police officer', 'weather',
];

export function scoreArticle(article: CollectedArticle): ScoringResult {
  const title = article.title;
  const summary = article.summary || '';
  const lowerText = `${title} ${summary}`.toLowerCase();

  // 1단계: ACRYL 자사 기사 체크 (별도 섹션)
  const acryl = isAcrylMention(title, summary);
  if (acryl) {
    return {
      relevance_score: 4,
      urgency: 'green',
      category: 'competitive',
      impact_comment: 'ACRYL 자사 관련',
      is_acryl_mention: true,
    };
  }

  // 2단계: 무관 기사 필터
  for (const pattern of IRRELEVANT_PATTERNS) {
    if (lowerText.includes(pattern.toLowerCase())) {
      return { relevance_score: 2, urgency: 'green', category: 'tech', impact_comment: '사업 무관', is_acryl_mention: false };
    }
  }

  // 3단계: 외부 인텔리전스 스코어링
  let bestScore = 3;
  let bestUrgency: Urgency = 'green';
  let bestCategory: Category = 'tech';
  let bestLabel = '';
  let matchCount = 0;

  for (const rule of SCORING_RULES) {
    for (const keyword of rule.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchCount++;
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

  // 복수 매칭 보너스
  if (matchCount >= 3) bestScore = Math.min(10, bestScore + 1);
  if (matchCount >= 2 && bestUrgency === 'green') bestUrgency = 'yellow';

  return {
    relevance_score: bestScore,
    urgency: bestUrgency,
    category: bestCategory,
    impact_comment: bestLabel || '일반 기술 뉴스',
    is_acryl_mention: false,
  };
}
