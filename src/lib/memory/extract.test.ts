import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '@/lib/storage/db';
import { complete } from '@/lib/llm/complete';
import { extractFactsFromMessages } from './extract';
import type { Message } from '@/types/db';

vi.mock('@/lib/llm/complete', () => ({ complete: vi.fn() }));

const messages: Message[] = [
  { id: '1', role: 'user', content: 'I love cats', ts: 1 },
];

describe('memory extraction responses', () => {
  it('accepts an explicitly empty result', async () => {
    vi.mocked(complete).mockResolvedValueOnce('{"facts":[]}');
    await expect(
      extractFactsFromMessages(messages, DEFAULT_SETTINGS.llm),
    ).resolves.toEqual([]);
  });

  it('treats malformed output as a failure so it can be retried', async () => {
    for (const response of [
      'No facts found',
      '{"facts":null}',
      '{"facts":[{}]}',
      '{bad}',
    ]) {
      vi.mocked(complete).mockResolvedValueOnce(response);
      await expect(
        extractFactsFromMessages(messages, DEFAULT_SETTINGS.llm),
      ).rejects.toThrow();
    }
  });
});
