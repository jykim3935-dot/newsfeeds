---
name: mcp-tools
description: MCP 도구 추가/수정 시 사용. mcp-handler + zod 패턴.
---
# MCP 도구 패턴
- 패키지: mcp-handler, @modelcontextprotocol/sdk, zod
- 라우트: app/api/mcp/[[...slug]]/route.ts
- 도구 등록: server.tool(name, description, zodSchema, handler)
- DB 접근: getSupabaseAdmin()
- 응답: { content: [{ type: 'text', text: JSON.stringify(data) }] }
- 참조: @docs/Architecture.md §7
