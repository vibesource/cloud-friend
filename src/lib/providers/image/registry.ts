import type { ImageConfig } from '@/types/db';
import { huggingfaceImageFactory } from './huggingface';
import type { ImageProvider, ImageProviderFactory } from './types';

const FACTORIES: Record<string, ImageProviderFactory> = {
  huggingface: huggingfaceImageFactory,
};

const instances = new Map<string, ImageProvider>();

interface ProviderDeps {
  apiKey: string;
  image: ImageConfig;
}

/**
 * Get a cached image provider. The provider is keyed by id; config updates
 * require either swapping to a different provider id or calling
 * applyConfig() to push new values into the running instance.
 */
export function getImageProvider(deps: ProviderDeps): ImageProvider {
  const factory = FACTORIES.huggingface;
  let instance = instances.get(factory.id);
  if (!instance) {
    instance = factory.create({
      apiKey: deps.apiKey,
      model: deps.image.model,
      width: deps.image.width,
      height: deps.image.height,
    });
    instances.set(factory.id, instance);
  }
  return instance;
}

/** Push updated config into a running provider instance. */
export function applyConfig(provider: ImageProvider, deps: ProviderDeps): void {
  const mutable = provider as ImageProvider & {
    updateConfig?: (c: {
      apiKey: string;
      model: string;
      width: number;
      height: number;
    }) => void;
  };
  mutable.updateConfig?.({
    apiKey: deps.apiKey,
    model: deps.image.model,
    width: deps.image.width,
    height: deps.image.height,
  });
}

export type { ImageProvider } from './types';
