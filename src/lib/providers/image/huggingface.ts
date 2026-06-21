import type { ImageProvider, ImageProviderFactory } from './types';

interface HFConfig {
  apiKey: string;
  model: string;
  width: number;
  height: number;
}

/**
 * Huggingface image generation provider. Uses the official JS SDK, which
 * works browser-side and returns a Blob. Free tier is rate-limited; the user
 * can supply a PRO token in Settings for higher limits.
 */
class HuggingfaceImageProvider implements ImageProvider {
  readonly id = 'huggingface';
  readonly label = 'Huggingface Inference';
  // Public so the registry can push updated config without recreating.
  config: HFConfig;
  private client: HFInferenceClient | null = null;

  constructor(config: HFConfig) {
    this.config = config;
  }

  /** Push new settings into the running instance. */
  updateConfig(config: HFConfig): void {
    // Only rebuild the InferenceClient if the API key changed.
    if (config.apiKey !== this.config.apiKey) {
      this.client = null;
    }
    this.config = config;
  }

  async isAvailable(): Promise<boolean> {
    return (
      this.config.apiKey.trim().length > 0 &&
      this.config.model.trim().length > 0
    );
  }

  async generate(prompt: string): Promise<Blob> {
    if (!(await this.isAvailable())) {
      throw new Error(
        'No Huggingface token or model set. Open Settings → Image generation.',
      );
    }

    // The HF SDK accepts parameters via a provider-specific `parameters` object.
    // Not all models honor width/height; the SDK ignores unknown keys gracefully.
    let blob: Blob;
    try {
      const client = await this.getClient();
      blob = await client.textToImage(
        {
          model: this.config.model,
          inputs: prompt,
          parameters: {
            width: this.config.width,
            height: this.config.height,
          },
        },
        { outputType: 'blob' },
      );
    } catch (err) {
      // HF returns a 429 when the model is cold-loading on the free tier.
      // Surface a friendly message; the user can retry after a moment.
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('429') || /rate limit/i.test(msg)) {
        throw new Error(
          'Cloud is warming up her paintbrushes. Try again in a few seconds!',
        );
      }
      if (msg.includes('401') || /unauthorized/i.test(msg)) {
        throw new Error(
          'The Huggingface token in Settings looks wrong. Double-check it.',
        );
      }
      throw new Error(`Image generation failed: ${msg.slice(0, 160)}`);
    }

    if (!blob || blob.size === 0) {
      throw new Error('Image generation returned an empty result.');
    }
    return blob;
  }

  private async getClient(): Promise<HFInferenceClient> {
    if (this.client) return this.client;
    // Keep the HF SDK out of the initial app bundle. It is only needed when
    // the child actually asks Cloud to draw.
    const mod = await import('@huggingface/inference');
    this.client = new mod.InferenceClient(this.config.apiKey);
    return this.client;
  }
}

type HFInferenceClient = {
  textToImage: (
    args: {
      model: string;
      inputs: string;
      parameters?: { width?: number; height?: number };
    },
    opts?: { outputType?: 'blob' },
  ) => Promise<Blob>;
};

export const huggingfaceImageFactory: ImageProviderFactory = {
  id: 'huggingface',
  create: (config) => new HuggingfaceImageProvider(config),
};
