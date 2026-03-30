---
name: claude-prompts
description: Claude API 프롬프트 작성/수정 시 사용.
---
# 프롬프트 규칙
- ACRYL_CONTEXT → system prompt (callClaude의 system 파라미터). user message에 넣지 말 것.
- 기존 prompts.ts 내용 보존. 구조만 재배치.
- Collection → model: 'fast', Curation/Analysis → model: 'smart'
- JSON 출력 시 예시 스키마 포함 + "JSON만 반환하세요"
- 호출: callClaude({ model, system: ACRYL_CONTEXT, userMessage, label })
- 파싱: safeParseJSON(result.message.content[0].text, fallback)
