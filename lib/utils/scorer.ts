import type { CollectedArticle, Category, Urgency } from '@/lib/types';

interface ScoringResult {
  relevance_score: number;
  urgency: Urgency;
  category: Category;
  impact_comment: string;
}

// ACRYL 사업 관점 스코어링 규칙
// 키워드가 아니라 "이 기사가 ACRYL 경영진에게 도움이 되는가"를 판단
const SCORING_RULES: Array<{
  keywords: string[];
  score: number;
  urgency: Urgency;
  category: Category;
  label: string;
}> = [
  // === 즉시 대응 (9-10점, red) ===
  // ACRYL 직접 언급
  { keywords: ['ACRYL', '아크릴', 'JONATHAN 플랫폼', 'GPUBASE', 'AGENTBASE', 'FLIGHTBASE', 'NADIA 피부'], score: 10, urgency: 'red', category: 'competitive', label: 'ACRYL 직접 언급 — IR/PR 대응 필요' },
  // 경쟁사 수주/제품/투자
  { keywords: ['제논', 'GenOn', '마인즈앤컴퍼니'], score: 9, urgency: 'red', category: 'competitive', label: '직접 경쟁사 동향 — 영업/전략 대응 필요' },
  { keywords: ['Run:ai', 'Run.ai'], score: 9, urgency: 'red', category: 'competitive', label: 'GPU 오케스트레이션 글로벌 경쟁사' },

  // === 사업 기회/위협 (7-8점, yellow) ===
  // GPU 인프라 시장
  { keywords: ['GPU 클라우드', 'GPU 오케스트레이션', 'GPU cluster', 'GPUaaS', 'GPU as a Service'], score: 8, urgency: 'yellow', category: 'market', label: 'GPU 인프라 시장 — GPUBASE 포지셔닝 관련' },
  // AI 인프라 경쟁사
  { keywords: ['래블업', 'Lablup', 'Backend.AI', '노타', 'Nota AI', '마키나락스', 'MakinaRocks', 'CoreWeave'], score: 8, urgency: 'yellow', category: 'competitive', label: 'AI 인프라 경쟁 동향' },
  // 파트너사
  { keywords: ['KT AI', '삼성SDS', '메가존클라우드'], score: 8, urgency: 'yellow', category: 'customer', label: '파트너사 AI 사업 — 협업 기회' },
  // AI 에이전트/MCP
  { keywords: ['AI 에이전트', 'AI agent', 'MCP protocol', 'agentic AI', 'function calling'], score: 7, urgency: 'yellow', category: 'tech', label: 'AI 에이전트 동향 — AGENTBASE 시장' },
  // 의료 AI (NADIA 관련)
  { keywords: ['의료 AI', 'healthcare AI', 'medical AI', 'SaMD', '디지털치료제', 'AI 진단', '피부질환', '뷰노', 'Lunit', '루닛'], score: 7, urgency: 'yellow', category: 'tech', label: '의료 AI — NADIA 시장/규제 동향' },
  // 공공 AI 사업
  { keywords: ['공공 AI', 'AI 조달', '나라장터', 'AI 데이터센터', '국가 AI'], score: 7, urgency: 'yellow', category: 'regulation', label: '공공 AI 사업 — 수주 기회' },
  // AI 인프라 투자
  { keywords: ['AI 투자', 'AI IPO', 'AI M&A', 'KOSDAQ AI', 'AI 밸류에이션', 'AI infra funding'], score: 7, urgency: 'yellow', category: 'investment', label: 'AI 인프라 투자 — IR 참고' },

  // === 참고 (5-6점, green) ===
  { keywords: ['NVIDIA', '엔비디아', 'H100', 'B200', 'Blackwell', 'GB200'], score: 6, urgency: 'green', category: 'tech', label: 'NVIDIA 동향 — GPU 공급망 참고' },
  { keywords: ['MLOps', 'model serving', 'inference optimization', 'vLLM', 'AI 플랫폼'], score: 6, urgency: 'green', category: 'tech', label: 'MLOps 기술 — FLIGHTBASE 참고' },
  { keywords: ['AI 정책', 'AI기본법', 'GS인증', '혁신제품'], score: 6, urgency: 'green', category: 'regulation', label: 'AI 정책 — 인증/규제 참고' },
  { keywords: ['리벨리온', 'Rebellions', '퓨리오사', 'FuriosaAI', 'Groq', 'Cerebras'], score: 5, urgency: 'green', category: 'tech', label: 'AI 반도체 — 하드웨어 동향' },
];

// 사업 무관 키워드 — 이 키워드가 있으면 점수 감점
const IRRELEVANT_PATTERNS = [
  '맛집', '여행', '연예', '스포츠', '날씨', '부동산', '주식 추천',
  'ChatGPT 사용법', 'AI 그림', 'AI 음악', 'AI 작곡', 'AI 번역',
  '학회 개최', '세미나 안내', '컨퍼런스 참가', '워크숍 개최',
];

// 대소문자 구분이 필요한 키워드 (영문 제품명 등)
const CASE_SENSITIVE_KEYWORDS = ['ACRYL', 'GPUBASE', 'AGENTBASE', 'FLIGHTBASE', 'JONATHAN 플랫폼'];

export function scoreArticle(article: CollectedArticle): ScoringResult {
  const rawText = `${article.title} ${article.summary || ''}`;
  const lowerText = rawText.toLowerCase();

  // 무관 기사 필터링
  for (const pattern of IRRELEVANT_PATTERNS) {
    if (lowerText.includes(pattern.toLowerCase())) {
      return { relevance_score: 2, urgency: 'green', category: 'tech', impact_comment: '사업 무관' };
    }
  }

  let bestScore = 3;
  let bestUrgency: Urgency = 'green';
  let bestCategory: Category = 'tech';
  let bestLabel = '일반 기술 뉴스';
  let matchCount = 0;

  for (const rule of SCORING_RULES) {
    let matched = false;
    for (const keyword of rule.keywords) {
      // 대소문자 구분 키워드는 원본 텍스트에서 매칭
      const isCaseSensitive = CASE_SENSITIVE_KEYWORDS.includes(keyword);
      const haystack = isCaseSensitive ? rawText : lowerText;
      const needle = isCaseSensitive ? keyword : keyword.toLowerCase();
      if (haystack.includes(needle)) {
        matched = true;
        if (rule.score > bestScore) {
          bestScore = rule.score;
          bestUrgency = rule.urgency;
          bestCategory = rule.category;
          bestLabel = rule.label;
        }
        break;
      }
    }
    if (matched) matchCount++;
  }

  // 복수 규칙 매칭 → 사업 관련도 높음
  if (matchCount >= 3) bestScore = Math.min(10, bestScore + 1);
  if (matchCount >= 2 && bestUrgency === 'green') bestUrgency = 'yellow';

  return {
    relevance_score: bestScore,
    urgency: bestUrgency,
    category: bestCategory,
    impact_comment: bestLabel,
  };
}
