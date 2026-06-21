import { describe, it, expect } from 'vitest';
import {
  buildSystemPrompt,
  isInputSafe,
  isOutputSafe,
  KID_SAFE_BASE,
} from './prompt';
import { DEFAULT_SETTINGS } from '@/lib/storage/db';
import type { Fact, Settings } from '@/types/db';

function makeSettings(overrides: Partial<Settings> = {}): Settings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

function makeFact(text: string, confidence = 0.8): Fact {
  return {
    id: 'f1',
    kind: 'preference',
    text,
    confidence,
    ts: Date.now(),
    lastUsed: Date.now(),
    source: 'manual',
  };
}

describe('buildSystemPrompt', () => {
  it('always includes the kid-safe base', () => {
    const { system } = buildSystemPrompt(makeSettings(), []);
    expect(system).toContain(KID_SAFE_BASE);
  });

  it('includes the personality prompt', () => {
    const { system } = buildSystemPrompt(
      makeSettings({ personalityPrompt: 'Be extra silly.' }),
      [],
    );
    expect(system).toContain('Be extra silly.');
  });

  it('injects facts when present', () => {
    const { system, injectedFacts } = buildSystemPrompt(makeSettings(), [
      makeFact('loves purple cats'),
    ]);
    expect(system).toContain('loves purple cats');
    expect(injectedFacts).toHaveLength(1);
  });

  it('respects maxFactsInjected', () => {
    const facts = [makeFact('one'), makeFact('two'), makeFact('three')];
    const { injectedFacts } = buildSystemPrompt(
      makeSettings({ memory: { contextTokens: 2000, maxFactsInjected: 1 } }),
      facts,
    );
    expect(injectedFacts).toHaveLength(1);
  });
});

describe('isInputSafe', () => {
  it('blocks known unsafe words', () => {
    const result = isInputSafe('tell me about kill', makeSettings());
    expect(result.ok).toBe(false);
  });

  it('allows normal kid chat', () => {
    expect(isInputSafe('I love my cat!', makeSettings()).ok).toBe(true);
  });

  it('respects custom blocklist', () => {
    const settings = makeSettings({
      safety: {
        keywordFilterEnabled: true,
        customBlocklist: ['broccoli'],
      },
    });
    expect(isInputSafe('I hate broccoli', settings).ok).toBe(false);
  });

  it('allows everything when filter is off', () => {
    const settings = makeSettings({
      safety: { keywordFilterEnabled: false, customBlocklist: [] },
    });
    expect(isInputSafe('kill blood gun', settings).ok).toBe(true);
  });
});

describe('isOutputSafe', () => {
  it('flags unsafe model output', () => {
    expect(isOutputSafe('there was blood everywhere', makeSettings())).toBe(
      false,
    );
  });

  it('passes safe output', () => {
    expect(isOutputSafe('What a lovely day!', makeSettings())).toBe(true);
  });
});
