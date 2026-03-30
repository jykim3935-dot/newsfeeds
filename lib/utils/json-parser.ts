export function safeParseJSON<T>(text: string, fallback: T): T {
  try { return JSON.parse(text); } catch { /* continue */ }

  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()); } catch { /* continue */ }
  }

  for (const [open, close] of [['{', '}'], ['[', ']']] as const) {
    const startIdx = text.indexOf(open);
    if (startIdx === -1) continue;

    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = startIdx; i < text.length; i++) {
      const ch = text[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === open) depth++;
      if (ch === close) depth--;
      if (depth === 0) {
        try { return JSON.parse(text.slice(startIdx, i + 1)); } catch { break; }
      }
    }
  }

  return fallback;
}
