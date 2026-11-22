import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, DEFAULT_SETTINGS } from '@/lib/storage/db';
import { extractFactsFromMessages } from './extract';
import { scheduleMemoryExtraction } from './queue';
import type { Fact, Message } from '@/types/db';

vi.mock('./extract', () => ({ extractFactsFromMessages: vi.fn() }));

const config = DEFAULT_SETTINGS.llm;
const makeMessage = (id: number): Message => ({
  id: `m${id}`,
  role: 'user',
  content: `Message ${id}`,
  ts: id,
});
const fact: Fact = {
  id: 'f1',
  kind: 'interest',
  text: 'likes cats',
  confidence: 0.6,
  ts: 1,
  lastUsed: 1,
};

beforeEach(async () => {
  await db.messages.clear();
  await db.facts.clear();
  vi.mocked(extractFactsFromMessages).mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe('memory extraction queue', () => {
  it('processes bounded batches once, including existing unmarked history', async () => {
    const messages = Array.from({ length: 45 }, (_, i) => makeMessage(i));
    await db.messages.bulkPut(messages);
    vi.mocked(extractFactsFromMessages).mockResolvedValue([]);
    await scheduleMemoryExtraction(messages, config);
    expect(
      vi
        .mocked(extractFactsFromMessages)
        .mock.calls.map(([batch]) => batch.length),
    ).toEqual([20, 20, 5]);
    expect((await db.messages.toArray()).every((m) => m.memoryExtracted)).toBe(
      true,
    );
    await scheduleMemoryExtraction(messages, config);
    expect(extractFactsFromMessages).toHaveBeenCalledTimes(3);
  });

  it('retries failures without marking messages or saving facts prematurely', async () => {
    const messages = [makeMessage(1)];
    await db.messages.bulkPut(messages);
    vi.mocked(extractFactsFromMessages)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce([fact]);
    await scheduleMemoryExtraction(messages, config);
    expect((await db.messages.get('m1'))?.memoryExtracted).toBeUndefined();
    expect(await db.facts.count()).toBe(0);
    await scheduleMemoryExtraction(messages, config);
    expect((await db.messages.get('m1'))?.memoryExtracted).toBe(true);
    expect(await db.facts.count()).toBe(1);
  });

  it('serializes overlapping requests and includes newly evicted messages', async () => {
    const messages = [makeMessage(1), makeMessage(2)];
    await db.messages.bulkPut(messages);
    let finish!: (facts: Fact[]) => void;
    vi.mocked(extractFactsFromMessages)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValue([]);
    const first = scheduleMemoryExtraction([messages[0]], config);
    await vi.waitFor(() => expect(finish).toBeDefined());
    const second = scheduleMemoryExtraction(messages, config);
    finish([fact]);
    await Promise.all([first, second]);
    expect(
      vi
        .mocked(extractFactsFromMessages)
        .mock.calls.map(([batch]) => batch.map((m) => m.id)),
    ).toEqual([['m1'], ['m2']]);
    expect(await db.facts.count()).toBe(1);
  });

  it('does not restore memories if chat is cleared during extraction', async () => {
    const messages = [makeMessage(1)];
    await db.messages.bulkPut(messages);
    let finish!: (facts: Fact[]) => void;
    vi.mocked(extractFactsFromMessages).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const work = scheduleMemoryExtraction(messages, config);
    await vi.waitFor(() => expect(finish).toBeDefined());
    await db.messages.clear();
    finish([fact]);
    await work;
    expect(await db.facts.count()).toBe(0);
    expect(await db.messages.count()).toBe(0);
  });
});
