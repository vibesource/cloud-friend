import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@/lib/storage/db';
import { REFUSAL } from './prompt';
import { consumeSafeStream } from './stream';
import type { Settings } from '@/types/db';

async function run(chunks: string[], settings: Settings = DEFAULT_SETTINGS) {
  const snapshots: string[] = [];
  let consumed = 0;
  let closed = false;
  async function* stream() {
    try {
      for (const chunk of chunks) {
        consumed++;
        yield chunk;
      }
    } finally {
      closed = true;
    }
  }
  const result = await consumeSafeStream(stream(), settings, async (text) => {
    snapshots.push(text);
  });
  return { result, snapshots, consumed, closed };
}

describe('streaming output safety', () => {
  it('streams safe text and releases a held prefix at the end', async () => {
    const { result, snapshots } = await run(['Hello ', 'little ', 'kit']);
    expect(snapshots[0]).toBe('Hello ');
    expect(result).toEqual({
      content: 'Hello little kit',
      imagePrompt: null,
      blocked: false,
    });
  });

  it('blocks a mixed-case word split across chunks and closes the stream', async () => {
    const { result, snapshots, consumed, closed } = await run([
      'Oh no, bl',
      'Oo',
      'D',
      ' more',
    ]);
    expect(snapshots).toEqual(['Oh no, ']);
    expect(result).toEqual({
      content: REFUSAL,
      imagePrompt: null,
      blocked: true,
    });
    expect(consumed).toBe(3);
    expect(closed).toBe(true);
  });

  it('honors custom words, including spaces, and ignores blank entries', async () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      safety: {
        keywordFilterEnabled: true,
        customBlocklist: ['  BLUE whale ', '  '],
      },
    };
    const { result, snapshots } = await run(['A blue ', 'wh', 'ale'], settings);
    expect(snapshots).toEqual(['A ']);
    expect(result.content).toBe(REFUSAL);
  });

  it('holds Unicode prefixes whose lowercase form expands', async () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      safety: { keywordFilterEnabled: true, customBlocklist: ['i\u0307x'] },
    };
    const { result, snapshots } = await run(['Hi İ', 'x'], settings);
    expect(snapshots).toEqual(['Hi ']);
    expect(result.blocked).toBe(true);
  });

  it('uses a safe fallback if the standard refusal matches a custom word', async () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      safety: { keywordFilterEnabled: true, customBlocklist: ['rather'] },
    };
    const { result } = await run(['blood'], settings);
    expect(result.content).toBe('…');
  });

  it('respects a disabled filter', async () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      safety: { keywordFilterEnabled: false, customBlocklist: [] },
    };
    const { result } = await run(['bl', 'ood'], settings);
    expect(result).toEqual({
      content: 'blood',
      imagePrompt: null,
      blocked: false,
    });
  });

  it('hides streamed image markers and preserves safe image requests', async () => {
    const { result, snapshots } = await run([
      'A cat! {',
      '{IM',
      'G:fluffy cat',
      '}}',
    ]);
    expect(snapshots.every((s) => !s.includes('{'))).toBe(true);
    expect(result).toEqual({
      content: 'A cat!',
      imagePrompt: 'fluffy cat',
      blocked: false,
    });
  });

  it('does not generate images from blocked responses or prompts', async () => {
    const { result } = await run(['A picture {{IMG:bl', 'ood}}']);
    expect(result).toEqual({
      content: REFUSAL,
      imagePrompt: null,
      blocked: true,
    });
  });

  it('checks text formed when a marker is removed', async () => {
    const { result } = await run(['ki{{IMG:cat}}ll']);
    expect(result).toEqual({
      content: REFUSAL,
      imagePrompt: null,
      blocked: true,
    });
  });
});
