import type { TTSConfig } from '@/types/db';
import { kokoroTTSFactory } from './kokoro';
import { webSpeechTTSFactory } from './web-speech';
import type { TTSProvider, TTSProviderFactory } from './types';

const FACTORIES: Record<string, TTSProviderFactory> = {
  'web-speech': webSpeechTTSFactory,
  kokoro: kokoroTTSFactory,
};

const instances = new Map<string, TTSProvider>();

/**
 * Get a cached TTS provider for the given config. The provider is keyed by id
 * so swapping configs (e.g. changing voice) keeps the same instance — the
 * instance reads config fresh on each speak() via its bound reference.
 *
 * Callers MUST keep the returned provider's internal config in sync if it
 * changes — use applyConfig() for that.
 */
export function getTTSProvider(config: TTSConfig): TTSProvider {
  const factory = FACTORIES[config.provider] ?? webSpeechTTSFactory;
  let instance = instances.get(factory.id);
  if (!instance) {
    instance = factory.create(config);
    instances.set(factory.id, instance);
  }
  return instance;
}

/** Push updated config into a running provider instance (if it supports it). */
export function applyConfig(provider: TTSProvider, config: TTSConfig): void {
  const mutable = provider as TTSProvider & {
    updateConfig?: (c: TTSConfig) => void;
  };
  mutable.updateConfig?.(config);
}

export function listAvailableProviders(): { id: string; label: string }[] {
  return Object.values(FACTORIES).map((f) => {
    // Each factory's prototype instance has a label; we make a throwaway to
    // read it. Cheaper than instantiating real providers on demand.
    const probe = f.create({
      provider: f.id,
      voice: '',
      rate: 1,
      pitch: 1,
      kokoroDtype: 'q8',
    } as TTSConfig);
    return { id: probe.id, label: probe.label };
  });
}

export type { TTSProvider, VoiceInfo } from './types';
