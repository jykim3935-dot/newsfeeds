# ACRYL Intelligence Brief

AI 경영정보 뉴스레터 + MCP 인텔리전스 시스템. 1인 운영 내부 시스템.

## 기존 코드 방침

`jykim3935-dot/News` repo fork → 리팩토링. 기존 `lib/prompts.ts`의 프롬프트 텍스트 반드시 보존. 새 디렉토리 구조로 재배치.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Supabase · Claude API (Haiku+Sonnet) · Resend · Vercel
MCP: mcp-handler + @modelcontextprotocol/sdk + zod

## Structure

- `lib/clients/`      — anthropic(callClaude), supabase, resend
- `lib/collectors/`    — 5종 수집기 (rss, websearch, dart, gov, research)
- `lib/processors/`    — curator, trend-detector, executive-brief
- `lib/renderers/`     — newsletter (라이트 카드형 <102KB), subject-line
- `lib/mcp/`           — MCP Server (8개 도구, mcp-handler 기반)
- `lib/utils/`         — json-parser(safeParseJSON), dedup, logger
- `lib/types/`         — 전체 타입 정의
- `lib/prompts/`       — 기존 prompts.ts를 4파일로 분할 (context, collection, curation, analysis)
- `app/api/mcp/[[...slug]]/` — MCP Streamable HTTP 엔드포인트

## Commands

- `npm run dev` — 개발 (Turbopack)
- `npm run build && npm run lint && npx tsc --noEmit`
- `npm test` — Vitest
- `npm test -- --run __tests__/utils/json-parser.test.ts` — 단일 테스트

## Key Rules

1. Claude API → 반드시 `callClaude()` (lib/clients/anthropic.ts). `new Anthropic()` 직접 사용 금지.
2. JSON 파싱 → 반드시 `safeParseJSON()` (lib/utils/json-parser.ts). `JSON.parse()` 직접 사용 금지.
3. 모델 → Collection은 `'fast'` (Haiku), Curation/Analysis는 `'smart'` (Sonnet).
4. 뉴스레터 HTML → table만, inline style만, flex/gradient 금지, <102KB.
5. 에러 격리 → 파이프라인 각 Step 독립 try-catch. 실패 시 warnings 추가, 다음 Step 계속.

## Prompts

기존 repo `lib/prompts.ts`의 프롬프트를 4파일로 분할. ACRYL_CONTEXT는 system prompt로 분리(Prompt Caching). 내용 변경 금지 — 구조만 재배치.

## Design Docs

- 아키텍처 + 타입 + API + MCP 구현: @docs/Architecture.md
- 실행 계획 + 프리셋 + Seed SQL + HTML 스켈레톤: @docs/Plan.md
- 코드 분석 + 근거: @docs/research.md
