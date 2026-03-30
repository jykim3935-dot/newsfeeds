import { describe, it, expect } from 'vitest';
import { safeParseJSON } from '@/lib/utils/json-parser';

describe('safeParseJSON', () => {
  it('parses valid JSON directly', () => {
    expect(safeParseJSON('{"a":1}', {})).toEqual({ a: 1 });
  });
  it('extracts from code blocks', () => {
    expect(safeParseJSON('text\n```json\n{"b":2}\n```\nmore', {})).toEqual({ b: 2 });
  });
  it('handles nested braces', () => {
    expect(safeParseJSON('xx {"a":{"b":{"c":1}}} yy', {})).toEqual({ a: { b: { c: 1 } } });
  });
  it('handles arrays', () => {
    expect(safeParseJSON('Result: [1,2,3]', [])).toEqual([1, 2, 3]);
  });
  it('returns fallback on garbage', () => {
    expect(safeParseJSON('no json', 'fb')).toBe('fb');
  });
  it('handles strings with braces inside', () => {
    expect(safeParseJSON('{"m":"hello {w}"}', {})).toEqual({ m: 'hello {w}' });
  });
});
