import type { Message } from '@/types/db';

const APPROX_CHARS_PER_TOKEN = 4;

export interface ContextWindow {
  /** Messages that fit in the budget, oldest-first, only user/assistant. */
  included: Message[];
  /** Messages that fell outside the budget, oldest-first (candidates for extraction). */
  evicted: Message[];
}

/**
 * Approximate token cost of a message. We don't have a tokenizer, so use a
 * rough chars-per-token heuristic. Overestimating slightly is fine — better to
 * evict a bit early than blow the model's real context window.
 */
function estimateTokens(message: Message): number {
  return Math.ceil((message.content.length + 8) / APPROX_CHARS_PER_TOKEN);
}

/**
 * Walk messages from newest to oldest, accumulating token cost until the
 * budget is reached. Anything older than the cutoff is "evicted" — those are
 * candidates for memory extraction.
 *
 * System messages are not part of this calculation; the system prompt is added
 * separately by the caller.
 */
export function selectContextWindow(
  messages: Message[],
  tokenBudget: number,
): ContextWindow {
  const dialog = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .sort((a, b) => a.ts - b.ts);

  const budget = Math.max(0, tokenBudget);
  const included: Message[] = [];
  let used = 0;

  for (let i = dialog.length - 1; i >= 0; i--) {
    const msg = dialog[i];
    const cost = estimateTokens(msg);
    if (used + cost > budget && included.length > 0) break;
    used += cost;
    included.unshift(msg);
  }

  const includedIds = new Set(included.map((m) => m.id));
  const evicted = dialog.filter((m) => !includedIds.has(m.id));

  return { included, evicted };
}
