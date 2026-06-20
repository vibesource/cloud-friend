import { db } from '@/lib/storage/db';
import type { Fact } from '@/types/db';

/**
 * Insert new facts, deduplicating against existing ones by normalized text.
 * If a duplicate is found, bump its confidence slightly and refresh lastUsed.
 */
export async function upsertFacts(newFacts: Fact[]): Promise<void> {
  if (newFacts.length === 0) return;

  const existing = await db.facts.toArray();
  const existingByKey = new Map<string, Fact>();
  for (const f of existing) {
    existingByKey.set(normalize(f.text), f);
  }

  const now = Date.now();
  const toPut: Fact[] = [];

  for (const nf of newFacts) {
    const key = normalize(nf.text);
    const match = existingByKey.get(key);
    if (match) {
      toPut.push({
        ...match,
        confidence: Math.min(1, match.confidence + 0.1),
        lastUsed: now,
      });
    } else {
      toPut.push(nf);
      existingByKey.set(key, nf);
    }
  }

  await db.facts.bulkPut(toPut);
}

export async function markFactsUsed(facts: Fact[]): Promise<void> {
  if (facts.length === 0) return;
  const now = Date.now();
  await db.facts.bulkPut(facts.map((f) => ({ ...f, lastUsed: now })));
}

export async function deleteFact(id: string): Promise<void> {
  await db.facts.delete(id);
}

export async function clearAllFacts(): Promise<void> {
  await db.facts.clear();
}

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}
