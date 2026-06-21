import { db } from '@/lib/storage/db';
import type { Fact } from '@/types/db';
import { rankFacts } from './rank';

const META_KEY = 'last-proactive-recall';
const COOLDOWN_MS = 1000 * 60 * 5; // at most once every 5 minutes
const MIN_CONFIDENCE = 0.55;

export interface RecallCue {
  fact: Fact;
  instruction: string;
}

export async function maybeChooseRecallCue(
  facts: Fact[],
  now: number = Date.now(),
): Promise<RecallCue | null> {
  const last = await getLastRecallAt();
  if (last && now - last < COOLDOWN_MS) return null;

  // Don't recall too often even outside cooldown. This keeps Cloud from
  // sounding like she's mining memories.
  if (Math.random() > 0.22) return null;

  const candidates = rankFacts(facts, now).filter(
    (f) => f.confidence >= MIN_CONFIDENCE && isRecallable(f.text),
  );
  const fact = candidates[0];
  if (!fact) return null;

  return {
    fact,
    instruction: [
      'OPTIONAL MEMORY NUDGE:',
      `You may naturally and briefly reference this remembered detail if it fits the conversation: "${fact.text}".`,
      'Do not force it. Do not say "I remember" every time. If it does not fit, ignore this instruction.',
    ].join('\n'),
  };
}

export async function markRecallUsed(): Promise<void> {
  await db.meta.put({ key: META_KEY, value: Date.now() });
}

async function getLastRecallAt(): Promise<number | null> {
  const row = await db.meta.get(META_KEY);
  return typeof row?.value === 'number' ? row.value : null;
}

function isRecallable(text: string): boolean {
  const lower = text.toLowerCase();
  // Avoid resurfacing emotionally heavy or logistical details proactively.
  if (
    /\b(worried|sad|scared|afraid|hurt|sick|test|exam|doctor|private)\b/.test(
      lower,
    )
  ) {
    return false;
  }
  return text.length >= 8 && text.length <= 120;
}
