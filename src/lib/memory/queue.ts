import { db } from '@/lib/storage/db';
import { extractFactsFromMessages } from './extract';
import { upsertFacts } from './store';
import type { LLMConfig, Message } from '@/types/db';

const MAX_MESSAGES = 20;
const MAX_CHARACTERS = 12000;
const pending = new Map<string, Message>();
let running: Promise<void> | undefined;
let latestConfig: LLMConfig;

/** Queue evicted messages; failures remain eligible for retry on a later turn. */
export function scheduleMemoryExtraction(
  messages: Message[],
  config: LLMConfig,
): Promise<void> {
  for (const message of messages) {
    if (!message.memoryExtracted) pending.set(message.id, message);
  }
  latestConfig = config;
  if (!running && pending.size) {
    running = processQueue().finally(() => {
      running = undefined;
    });
  }
  return running ?? Promise.resolve();
}

async function processQueue(): Promise<void> {
  try {
    while (pending.size > 0) {
      const ids = [...pending.keys()];
      const rows = await db.messages.bulkGet(ids);
      const candidates: Message[] = [];
      let characters = 0;
      for (let i = 0; i < ids.length; i++) {
        const row = rows[i];
        if (!row || row.memoryExtracted) {
          pending.delete(ids[i]);
          continue;
        }
        if (candidates.length >= MAX_MESSAGES) continue;
        if (
          candidates.length &&
          characters + row.content.length > MAX_CHARACTERS
        )
          break;
        candidates.push(row);
        characters += row.content.length;
      }
      if (!candidates.length) continue;

      const facts = await extractFactsFromMessages(candidates, latestConfig);
      // Commit facts and progress together. Re-read the rows so deleted,
      // edited, or concurrently processed messages cannot restore stale facts.
      await db.transaction('rw', db.messages, db.facts, async () => {
        const current = await db.messages.bulkGet(candidates.map((m) => m.id));
        if (
          current.some(
            (row, i) =>
              !row ||
              row.memoryExtracted ||
              row.content !== candidates[i].content,
          )
        ) {
          return;
        }
        await upsertFacts(facts);
        await db.messages.bulkPut(
          current.map((row) => ({ ...row!, memoryExtracted: true })),
        );
      });
      // On a competing transaction, re-read the pending rows and process any
      // still-unprocessed messages in the next iteration.
    }
  } catch {
    // A network error or invalid response leaves messages pending. The next
    // chat turn retries them instead of silently losing the memories.
  }
}
