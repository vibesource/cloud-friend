import 'fake-indexeddb/auto';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, DEFAULT_SETTINGS } from '@/lib/storage/db';
import { getImageProvider } from '@/lib/providers/image/registry';
import { useImageGen } from './useImageGen';
import type { ImageProvider } from '@/lib/providers/image/types';

vi.mock('@/lib/providers/image/registry', () => ({
  getImageProvider: vi.fn(),
  applyConfig: vi.fn(),
}));
vi.mock('@/lib/stickers/store', () => ({ awardSticker: vi.fn() }));

const settings = { ...DEFAULT_SETTINGS, huggingfaceToken: 'test' };
const generate = vi.fn<ImageProvider['generate']>();
const provider: ImageProvider = {
  id: 'test',
  label: 'test',
  isAvailable: async () => true,
  generate,
};
const image = new Blob(['image'], { type: 'image/png' });

beforeEach(async () => {
  await db.messages.clear();
  await db.images.clear();
  await db.messages.bulkPut([
    { id: 'first', role: 'assistant', content: 'drawing', ts: 1 },
    { id: 'second', role: 'assistant', content: 'drawing again', ts: 2 },
  ]);
  generate.mockReset();
  vi.mocked(getImageProvider).mockReturnValue(provider);
  vi.stubGlobal(
    'URL',
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:test') }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('image generation cancellation', () => {
  it('ignores a late result after cancellation without saving or attaching it', async () => {
    let finish!: (blob: Blob) => void;
    generate.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { result } = renderHook(() => useImageGen(settings));
    let work!: Promise<void>;
    act(() => {
      work = result.current.generateForMessage('first', 'a cat');
    });
    await waitFor(() => expect(generate).toHaveBeenCalled());
    const signal = generate.mock.calls[0][1]?.signal;
    act(() => result.current.cancel());
    expect(signal?.aborted).toBe(true);
    expect(result.current.cancelledForMessageId).toBe('first');
    await act(async () => {
      finish(image);
      await work;
    });
    expect(await db.images.count()).toBe(0);
    expect((await db.messages.get('first'))?.imageId).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it('does not let an older cancelled request clear a new drawing', async () => {
    let finishFirst!: (blob: Blob) => void;
    let finishSecond!: (blob: Blob) => void;
    generate
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishSecond = resolve;
          }),
      );
    const { result } = renderHook(() => useImageGen(settings));
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = result.current.generateForMessage('first', 'a cat');
    });
    await waitFor(() => expect(generate).toHaveBeenCalledTimes(1));
    act(() => result.current.cancel());
    act(() => {
      second = result.current.generateForMessage('second', 'a cat');
    });
    await waitFor(() => expect(generate).toHaveBeenCalledTimes(2));
    await act(async () => {
      finishFirst(image);
      await first;
    });
    expect(result.current.generatingForMessageId).toBe('second');
    await act(async () => {
      finishSecond(image);
      await second;
    });
    expect(await db.images.count()).toBe(1);
    expect((await db.messages.get('second'))?.imageId).toBeDefined();
    expect((await db.messages.get('first'))?.imageId).toBeUndefined();
  });
});
