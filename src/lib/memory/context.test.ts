import { describe, it, expect } from 'vitest';
import { selectContextWindow } from './context';
import type { Message } from '@/types/db';

function msg(id: string, content: string, role: 'user' | 'assistant'): Message {
  return { id, role, content, ts: parseInt(id, 10) };
}

describe('selectContextWindow', () => {
  it('includes everything when under budget', () => {
    const messages = [msg('1', 'hello', 'user'), msg('2', 'hi', 'assistant')];
    const result = selectContextWindow(messages, 1000);
    expect(result.included).toHaveLength(2);
    expect(result.evicted).toHaveLength(0);
  });

  it('evicts oldest messages when over budget', () => {
    const messages = [
      msg('1', 'old message one', 'user'),
      msg('2', 'old message two', 'assistant'),
      msg('3', 'recent', 'user'),
    ];
    const result = selectContextWindow(messages, 5);
    expect(result.included.length).toBeLessThan(messages.length);
    expect(result.evicted.length).toBeGreaterThan(0);
    // The most recent message is always included.
    expect(result.included[result.included.length - 1].id).toBe('3');
  });

  it('always includes at least one message', () => {
    const messages = [msg('1', 'x'.repeat(1000), 'user')];
    const result = selectContextWindow(messages, 10);
    expect(result.included).toHaveLength(1);
  });

  it('handles empty input', () => {
    const result = selectContextWindow([], 1000);
    expect(result.included).toHaveLength(0);
    expect(result.evicted).toHaveLength(0);
  });

  it('filters out system messages', () => {
    const messages = [
      { id: '0', role: 'system' as const, content: 'system', ts: 0 },
      msg('1', 'hello', 'user'),
    ];
    const result = selectContextWindow(messages, 1000);
    expect(result.included).toHaveLength(1);
  });
});
