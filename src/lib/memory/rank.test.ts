import { describe, it, expect } from 'vitest';
import { rankFacts } from './rank';
import type { Fact } from '@/types/db';

function fact(
  id: string,
  text: string,
  confidence: number,
  lastUsed: number,
): Fact {
  return { id, kind: 'preference', text, confidence, ts: 100, lastUsed };
}

describe('rankFacts', () => {
  it('returns higher-confidence facts before lower', () => {
    const now = 1000000;
    const facts = [
      fact('low', 'low conf', 0.3, now),
      fact('high', 'high conf', 0.9, now),
    ];
    const ranked = rankFacts(facts, now);
    expect(ranked[0].id).toBe('high');
    expect(ranked[1].id).toBe('low');
  });

  it('boosts recently-used facts', () => {
    const now = 1000000;
    const facts = [
      fact('old', 'old fact', 0.7, now - 1000 * 60 * 60 * 24 * 10),
      fact('recent', 'recent fact', 0.7, now),
    ];
    const ranked = rankFacts(facts, now);
    expect(ranked[0].id).toBe('recent');
  });

  it('handles empty input', () => {
    expect(rankFacts([], 1000)).toEqual([]);
  });
});
