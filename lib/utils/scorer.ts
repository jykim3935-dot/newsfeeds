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
  { keywords: ['래블업', 'Lablup', 'Backend.AI', 'Nota AI', '마키나락스', 'MakinaRocks', 'CoreWeave', 'VESSL AI'], score: 8, urgency: 'yellow', category: 'competitive', label: 'AI 인프라 경쟁 동향' },
  // 파트너사 (8점, yellow)
  { keywords: ['KT AI', '삼성SDS', '메가존클라우드'], score: 8, urgency: 'yellow', category: 'customer', label: '파트너사 동향 — 협업 기회' },

  // AI 에이전트/MCP (7점, yellow)
  { keywords: ['AI 에이전트', 'AI agent', 'MCP protocol', 'agentic AI'], score: 7, urgency: 'yellow', category: 'tech', label: 'AI 에이전트 — AGENTBASE 시장' },
  // 의료/바이오 AI (8점, yellow) — NADIA 관련 핵심
  { keywords: ['의료 AI', 'healthcare AI', 'medical AI', 'SaMD', '디지털치료제', 'AI 진단', '의료데이터', '의료 빅데이터', '정밀의료'], score: 8, urgency: 'yellow', category: 'tech', label: '의료 AI — NADIA 시장/규제' },
  { keywords: ['뷰노', '루닛', 'Lunit', '딥노이드', '제이엘케이', 'JLK', '셀바스AI'], score: 8, urgency: 'yellow', category: 'competitive', label: '의료 AI 경쟁사' },
  { keywords: ['바이오 AI', 'AI 신약', 'drug discovery', '바이오마커', 'AI 임상', '피부질환'], score: 7, urgency: 'yellow', category: 'tech', label: '바이오/제약 AI' },
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
  '희귀가스', '제논 파마', 'XENE', 'xenon gas',
  '휴머노이드 로봇', 'humanoid robot',
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

  // 3단계: 기본 점수 + 카테고리 추정
  let bestScore = 5; // 우리 소스에서 온 기사는 기본 표시
  let bestUrgency: Urgency = 'green';
  let bestCategory: Category = guessCategory(lowerText, article.content_type);
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
    impact_comment: bestLabel || '',
    is_acryl_mention: false,
  };
}

function guessCategory(text: string, contentType: string): Category {
  // content_type 기반
  if (contentType === 'investment') return 'investment';
  if (contentType === 'government') return 'regulation';
  if (contentType === 'consulting') return 'market';

  // 키워드 기반 카테고리 추정
  if (/투자|펀딩|ipo|상장|m&a|인수|매각|funding|series [a-c]/i.test(text)) return 'investment';
  if (/정책|규제|법안|정부|공공|조달|인증/i.test(text)) return 'regulation';
  if (/시장|전망|성장|매출|실적|점유율|market/i.test(text)) return 'market';
  if (/경쟁|수주|계약|파트너|협력|제휴/i.test(text)) return 'competitive';
  if (/고객|도입|구축|납품/i.test(text)) return 'customer';
  return 'tech';
}
