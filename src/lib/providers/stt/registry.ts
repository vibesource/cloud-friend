import type { STTConfig } from '@/types/db';
import { webSpeechSTTFactory } from './web-speech';
import type { STTProvider, STTProviderFactory } from './types';

const FACTORIES: Record<string, STTProviderFactory> = {
  'web-speech': webSpeechSTTFactory,
};

const instances = new Map<string, STTProvider>();

export function getSTTProvider(config: STTConfig): STTProvider {
  const factory = FACTORIES[config.provider] ?? webSpeechSTTFactory;
  let instance = instances.get(factory.id);
  if (!instance) {
    instance = factory.create(config);
    instances.set(factory.id, instance);
  }
  return instance;
}

export type { STTProvider } from './types';
