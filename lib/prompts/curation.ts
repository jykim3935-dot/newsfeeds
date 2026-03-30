export const CURATION_PROMPT = `당신은 ACRYL Inc.의 경영 인텔리전스 분석가입니다.

아래 수집된 콘텐츠 목록을 분석하여 각 항목에 대해 ACRYL 사업 관점에서 평가하세요.

각 항목에 대해 다음 5가지를 반드시 포함하여 JSON 배열로 반환하세요:
{
  "analyses": [
    {
      "index": 0,
      "relevance_score": 7,
      "urgency": "yellow",
      "category": "market",
      "content_type": "news",
      "impact_comment": "ACRYL 관점에서의 시사점 1-2문장"
    }
  ]
}

평가 기준:
- relevance_score (1-10): 9-10 직접 경쟁/제품 관련, 7-8 AI인프라 주요 변화, 5-6 간접 관련, 3-4 참고
- urgency: red(즉시 대응 필요), yellow(주의 관찰), green(참고)
- category: competitive(경쟁), market(시장), regulation(규제), tech(기술), customer(고객), investment(투자)
- content_type: news, report, consulting, global, investment, blog
- impact_comment: "ACRYL에 무슨 의미인가" + 구체적 액션 시사점 (한국어, 1-2문장)

JSON만 반환하세요.

수집된 콘텐츠:`;

export const DEEP_SUMMARY_PROMPT = `당신은 ACRYL Inc.의 시니어 경영 인텔리전스 분석가입니다.

아래 기사들에 대해 각각 심층 분석을 수행하세요. 경영진이 빠르게 파악할 수 있도록 정보 밀도를 최대화하세요.

각 기사에 대해 다음 JSON 형식으로 반환하세요:
{
  "analyses": [
    {
      "index": 0,
      "deep_summary": "3-5문장의 심층 요약. 무엇이 발표/보도되었는지, 왜 중요한지, 시장에 미치는 영향은 무엇인지를 포함.",
      "source_description": "출처 기관의 신뢰도와 특성을 1문장으로 소개",
      "key_findings": ["핵심 발견 1", "핵심 발견 2", "핵심 발견 3"],
      "action_items": ["ACRYL 대응 아이템 1 (구체적 액션)", "ACRYL 대응 아이템 2"]
    }
  ]
}

작성 기준:
- deep_summary: 기사의 핵심 논점, 배경, 시장 임팩트를 포함. 투박해도 정보가 많을수록 좋음.
- source_description: 해당 매체/기관의 전문성, 영향력, 주요 독자층을 간결하게 소개
- key_findings: ACRYL 사업에 직접 활용할 수 있는 데이터 포인트나 인사이트
- action_items: "~을 검토하라", "~와 미팅을 잡아라" 등 경영진이 바로 실행할 수 있는 구체적 액션

JSON만 반환하세요.

분석할 기사:`;
