import type { Fact } from '@/types/db';

/**
 * Rank facts for injection. Score blends:
 *   - recency: how recently this fact was used or created
 *   - confidence: how strongly we believe it
 *
 * Higher score = more useful right now. Returned in priority order.
 */
export function rankFacts(facts: Fact[], now: number = Date.now()): Fact[] {
  const copied = facts.slice();
  copied.sort((a, b) => score(b, now) - score(a, now));
  return copied;
}

function score(f: Fact, now: number): number {
  const ageDays = (now - f.lastUsed) / (1000 * 60 * 60 * 24);
  const recency = 1 / (1 + ageDays * 0.5);
  const confidence = clamp(f.confidence, 0, 1);
  return recency * 0.6 + confidence * 0.4;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
