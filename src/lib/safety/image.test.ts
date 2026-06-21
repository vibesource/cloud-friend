import { describe, it, expect } from 'vitest';
import { wrapImagePrompt } from './image';
import { DEFAULT_SETTINGS } from '@/lib/storage/db';
import type { Settings } from '@/types/db';

function settings(overrides: Partial<Settings> = {}): Settings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

describe('wrapImagePrompt', () => {
  it('wraps a normal prompt with kid-safe style tags', () => {
    const result = wrapImagePrompt('a rainbow cat', settings());
    expect('reject' in result).toBe(false);
    if ('prompt' in result) {
      expect(result.prompt).toContain('cute cartoon');
      expect(result.prompt).toContain('a rainbow cat');
    }
  });

  it('rejects empty prompts', () => {
    expect(wrapImagePrompt('', settings())).toEqual({ reject: true });
    expect(wrapImagePrompt('   ', settings())).toEqual({ reject: true });
  });

  it('rejects prompts with blocked words', () => {
    expect(wrapImagePrompt('a scary gun', settings())).toEqual({
      reject: true,
    });
  });

  it('respects custom blocklist', () => {
    const s = settings({
      safety: {
        keywordFilterEnabled: true,
        customBlocklist: ['zombie'],
      },
    });
    expect(wrapImagePrompt('a cute zombie', s)).toEqual({ reject: true });
  });

  it('allows everything when filter is off', () => {
    const s = settings({
      safety: { keywordFilterEnabled: false, customBlocklist: [] },
    });
    const result = wrapImagePrompt('a scary gun', s);
    expect('reject' in result).toBe(false);
  });
});
