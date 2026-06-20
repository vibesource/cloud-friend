import type { Fact, FactKind, LLMConfig, Message } from '@/types/db';
import { complete } from '@/lib/llm/complete';

const EXTRACTION_SYSTEM = [
  'You extract durable facts about a child from conversation snippets.',
  'Only extract facts the child has actually shared about themselves.',
  'Examples of facts worth keeping: their name (first name only), pets,',
  'family members, hobbies, favorite colors/animals/food, school events,',
  'upcoming plans, worries, things they are proud of.',
  'Never extract: scary, violent, or adult content. Skip those entirely.',
  'Never extract opinions the assistant expressed.',
  'Return zero, one, or a few facts as JSON. Schema:',
  '{ "facts": [{ "kind": "preference|event|person|interest", "text": "..." }] }',
  'Each "text" must be a short third-person statement, e.g.',
  '"has a cat named Mochi", "is nervous about Friday\'s spelling test",',
  '"loves drawing dragons". Keep text under 80 characters.',
  'Return only JSON. No prose. No code fences.',
].join(' ');

interface ExtractionResult {
  facts: Array<{ kind: FactKind; text: string }>;
}

function containsUnsafe(text: string): boolean {
  // Minimal local filter — extraction already has a strong system prompt,
  // but we never trust model output blindly.
  const lower = text.toLowerCase();
  return UNSAFE_KEYWORDS.some((w) => lower.includes(w));
}

const UNSAFE_KEYWORDS = [
  'kill',
  'blood',
  'gun',
  'knife',
  'sex',
  'porn',
  'drug',
  'nude',
  'naked',
];

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function makeFactId(): string {
  return newId();
}

export async function extractFactsFromMessages(
  evicted: Message[],
  config: LLMConfig,
  signal?: AbortSignal,
): Promise<Fact[]> {
  if (evicted.length === 0) return [];

  const transcript = evicted
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n');

  const raw = await complete({
    config,
    messages: [
      { role: 'system', content: EXTRACTION_SYSTEM },
      {
        role: 'user',
        content: `Conversation snippet:\n\n${transcript}\n\nExtract facts as JSON.`,
      },
    ],
    signal,
    temperature: 0,
    maxTokens: 400,
  });

  const parsed = parseExtractionResponse(raw).facts;
  const now = Date.now();
  const facts: Fact[] = [];

  for (const item of parsed) {
    const text = item.text.trim();
    if (text.length === 0 || text.length > 160) continue;
    if (containsUnsafe(text)) continue;
    facts.push({
      id: newId(),
      kind: item.kind,
      text,
      confidence: 0.6,
      ts: now,
      lastUsed: now,
      source: 'extracted',
    });
  }

  return facts;
}

function parseExtractionResponse(raw: string): ExtractionResult {
  const jsonText = extractJson(raw);
  if (!jsonText) return { facts: [] };
  try {
    const obj = JSON.parse(jsonText) as Partial<ExtractionResult>;
    const list = Array.isArray(obj.facts) ? obj.facts : [];
    const allowed: FactKind[] = ['preference', 'event', 'person', 'interest'];
    return {
      facts: list
        .filter(
          (f) => f && typeof f.text === 'string' && typeof f.kind === 'string',
        )
        .filter((f) => allowed.includes((f as { kind: FactKind }).kind))
        .map((f) => ({ kind: (f as { kind: FactKind }).kind, text: f.text })),
    };
  } catch {
    return { facts: [] };
  }
}

function extractJson(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);

  return null;
}
