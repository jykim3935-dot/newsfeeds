import type { ContentType } from '@/lib/types';

const ARTICLE_JSON_FORMAT = `{
  "articles": [
    {
      "title": "제목",
      "url": "URL",
      "source": "출처/매체명",
      "published_at": "날짜 (YYYY-MM-DD)",
      "summary": "핵심 내용 3-4문장 요약"
    }
  ]
}`;

export const WEB_SEARCH_PROMPTS: Record<ContentType, string> = {
  news: `당신은 ACRYL Inc.의 시장 인텔리전스 분석가입니다. 다음 키워드와 관련된 최신 한국 및 글로벌 뉴스 기사를 검색하세요.
최근 24시간 이내의 뉴스를 우선으로 검색하고, 없으면 최근 7일 이내 뉴스를 검색하세요.
AI 인프라, GPU 클라우드, MLOps, AI 에이전트, 헬스케어 AI 관련 뉴스를 폭넓게 수집하세요.

각 기사에 대해 다음 JSON 형식으로 반환하세요:
${ARTICLE_JSON_FORMAT}

10건 이내로 반환하세요. JSON만 반환하세요.`,

  report: `당신은 ACRYL Inc.의 리서치 분석가입니다. 다음 키워드와 관련된 최신 리서치 보고서, 연구기관 발간물을 검색하세요.
SPRi, KIET, ETRI, IITP, NIA, KDI, KISDI, KISA 등 한국 연구기관과 해외 리서치 기관의 최신 보고서를 찾으세요.
AI 시장 전망, GPU 수요 예측, AI 인프라 투자 동향 관련 보고서를 우선 검색하세요.

각 보고서에 대해 다음 JSON 형식으로 반환하세요:
${ARTICLE_JSON_FORMAT}

10건 이내로 반환하세요. JSON만 반환하세요.`,

  consulting: `당신은 ACRYL Inc.의 전략 분석가입니다. 다음 키워드와 관련된 McKinsey, BCG, Gartner, IDC, Forrester, Deloitte 등 글로벌 컨설팅펌의 최신 AI 인프라 관련 인사이트를 검색하세요.
AI infrastructure market, GPU-as-a-Service, AI agent platform, MLOps trends 관련 리포트를 우선 검색하세요.

각 인사이트에 대해 다음 JSON 형식으로 반환하세요:
${ARTICLE_JSON_FORMAT}

10건 이내로 반환하세요. JSON만 반환하세요.`,

  global: `당신은 ACRYL Inc.의 글로벌 정책 분석가입니다. 다음 키워드와 관련된 OECD, Stanford HAI, World Economic Forum, MIT Technology Review, EU AI Office 등 글로벌 기관의 최신 AI 정책/연구/동향을 검색하세요.
AI governance, compute infrastructure policy, AI safety regulation, sovereign AI 관련 동향을 포함하세요.

각 발간물에 대해 다음 JSON 형식으로 반환하세요:
${ARTICLE_JSON_FORMAT}

10건 이내로 반환하세요. JSON만 반환하세요.`,

  investment: `당신은 ACRYL Inc.의 IR/투자 분석가입니다. 다음 키워드와 관련된 최신 AI 인프라 투자, VC/PE 딜, KOSDAQ AI 종목 동향, 기업 실적 발표 등을 검색하세요.
AI 인프라 기업 IPO, GPU 클라우드 M&A, AI 스타트업 투자 유치 소식을 폭넓게 수집하세요.

각 정보에 대해 다음 JSON 형식으로 반환하세요:
${ARTICLE_JSON_FORMAT}

10건 이내로 반환하세요. JSON만 반환하세요.`,

  blog: `당신은 ACRYL Inc.의 기술 분석가입니다. 다음 키워드와 관련된 NVIDIA, Anthropic, OpenAI, Google AI, Hugging Face, a16z, Microsoft Research 등 주요 기업/기술 블로그의 최신 포스트를 검색하세요.
GPU orchestration, inference optimization, AI agent framework, MCP protocol 관련 기술 포스트를 우선 검색하세요.

각 포스트에 대해 다음 JSON 형식으로 반환하세요:
${ARTICLE_JSON_FORMAT}

10건 이내로 반환하세요. JSON만 반환하세요.`,

  government: `당신은 ACRYL Inc.의 정부정책 분석가입니다. 다음 키워드와 관련된 한국 정부의 최신 AI 관련 정책, 법안, 공공사업을 검색하세요.
검색 대상:
- 과학기술정보통신부, 산업통상자원부, 기획재정부의 AI 정책 발표
- AI기본법, 디지털플랫폼정부법, 데이터기본법 등 법안 동향
- 공공 AI 인프라 구축 사업, 나라장터 GPU/AI 관련 조달 공고
- 디지털뉴딜, 국가AI위원회, AI 윤리 가이드라인
- 지방자치단체 AI 사업 (스마트시티, AI 특구)

각 정책에 대해 다음 JSON 형식으로 반환하세요:
${ARTICLE_JSON_FORMAT}

10건 이내로 반환하세요. JSON만 반환하세요.`,

  research: `당신은 ACRYL Inc.의 기술 리서치 분석가입니다. 다음 키워드와 관련된 최신 학술 논문, 기술 리서치를 검색하세요.
검색 대상:
- arXiv: AI infrastructure, GPU scheduling, model serving, inference optimization
- MLSys, OSDI, SOSP 학회 논문
- GPU orchestration, multi-tenant GPU cluster, resource management
- AI agent architecture, tool use, function calling 관련 연구
- Medical AI, healthcare AI diagnostic 관련 논문

각 논문에 대해 다음 JSON 형식으로 반환하세요:
${ARTICLE_JSON_FORMAT}

10건 이내로 반환하세요. JSON만 반환하세요.`,
};

export const GOV_SEARCH_PROMPT = `당신은 ACRYL Inc.의 정부정책/공공사업 전문 분석가입니다. 한국 정부의 AI 관련 최신 정책, 사업, 규제 동향을 검색하세요.

집중 검색 대상:
1. 과학기술정보통신부 AI 정책 (AI 반도체, GPU 인프라, AI 데이터센터)
2. 산업통상자원부 AI 산업 지원 정책
3. 공공 AI 인프라 구축 사업 공고 (조달청, 나라장터)
4. AI기본법, 디지털플랫폼정부법 입법 동향
5. 국가AI위원회, 디지털뉴딜 관련 발표
6. 지자체 AI 특구, 스마트시티 사업

다음 JSON 형식으로 반환하세요:
${ARTICLE_JSON_FORMAT}

10건 이내로 반환하세요. JSON만 반환하세요.

검색 키워드:`;

export const RESEARCH_SEARCH_PROMPT = `당신은 ACRYL Inc.의 기술 리서치 분석가입니다. AI 인프라 관련 최신 학술 논문과 기술 리서치를 검색하세요.

집중 검색 대상:
1. GPU scheduling, GPU cluster management, multi-tenant GPU 관련 논문
2. Model serving, inference optimization, LLM deployment 관련 논문
3. AI agent orchestration, tool use, function calling 관련 연구
4. MLOps, ML platform, feature store 관련 논문
5. Medical AI, healthcare AI diagnosis 관련 연구
6. MCP (Model Context Protocol), AI agent interoperability 관련 기술 문서

다음 JSON 형식으로 반환하세요:
${ARTICLE_JSON_FORMAT}

10건 이내로 반환하세요. JSON만 반환하세요.

검색 키워드:`;

export const KEYWORD_EXPANSION_PROMPT = `당신은 검색 전문가입니다. 아래 키워드 목록을 분석하여 관련된 추가 검색어를 생성하세요.
원래 키워드가 놓칠 수 있는 관련 뉴스, 보고서, 논문을 더 많이 찾을 수 있는 확장 키워드를 생성합니다.

다음 JSON 형식으로 반환하세요:
{
  "expanded_keywords": ["확장 키워드 1", "확장 키워드 2", "확장 키워드 3", "확장 키워드 4", "확장 키워드 5"]
}

규칙:
- 원래 키워드의 동의어, 상위/하위 개념, 영문/한글 변환을 포함
- 최대 5개의 확장 키워드를 생성
- AI 인프라, GPU 클라우드, MLOps, AI 에이전트 도메인에 특화

JSON만 반환하세요.

원래 키워드:`;

export { ARTICLE_JSON_FORMAT };
