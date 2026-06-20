import type { TTSConfig } from '@/types/db';
import {
  preprocessForSpeech,
  type TTSProvider,
  type TTSProviderFactory,
  type VoiceInfo,
} from './types';

const KOKORO_MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';

/** A small friendly female voice set; aligned with Cloud's character. */
const DEFAULT_KOKORO_VOICE = 'af_sky';

/** Curated subset of Kokoro voices shown in settings. */
export const KOKORO_VOICES: VoiceInfo[] = [
  { id: 'af_sky', label: 'Sky — warm, bright girl', gender: 'female' },
  { id: 'af_heart', label: 'Heart — gentle', gender: 'female' },
  { id: 'af_bella', label: 'Bella — clear, friendly', gender: 'female' },
  { id: 'af_nova', label: 'Nova — playful', gender: 'female' },
  { id: 'af_alloy', label: 'Alloy — neutral', gender: 'neutral' },
  { id: 'am_puck', label: 'Puck — mischievous boy', gender: 'male' },
];

/**
 * Kokoro TTS provider. Loads an 82M-param model in-browser via Transformers.js
 * (WebGPU preferred, falls back to WASM). First-use downloads the model
 * (~80–200MB depending on quantization) and caches it.
 */
class KokoroTTS implements TTSProvider {
  readonly id = 'kokoro';
  readonly label = 'Cloud voice (Kokoro, in-browser)';
  private config: TTSConfig;
  private instance: KokoroInstance | null = null;
  private loadingPromise: Promise<KokoroInstance> | null = null;
  private currentAudio: HTMLAudioElement | null = null;

  constructor(config: TTSConfig) {
    this.config = config;
  }

  updateConfig(config: TTSConfig): void {
    this.config = config;
  }

  async isAvailable(): Promise<boolean> {
    return typeof window !== 'undefined' && typeof WebAssembly !== 'undefined';
  }

  async listVoices(): Promise<VoiceInfo[]> {
    return KOKORO_VOICES;
  }

  /**
   * Load the Kokoro model. Safe to call multiple times — returns the cached
   * instance. The progress callback fires during the one-time download.
   */
  async load(
    onProgress?: (ratio: number, message: string) => void,
  ): Promise<void> {
    if (this.instance) return;
    if (!this.loadingPromise) {
      this.loadingPromise = this.doLoad(onProgress).then((inst) => {
        this.instance = inst;
        return inst;
      });
    }
    await this.loadingPromise;
  }

  private async doLoad(
    onProgress?: (ratio: number, message: string) => void,
  ): Promise<KokoroInstance> {
    onProgress?.(0, 'Loading Kokoro library…');
    const mod = await import('kokoro-js');
    const KokoroTTSClass = mod.KokoroTTS;

    // Choose device + dtype. WebGPU is much faster when available.
    const hasWebGpu = typeof navigator !== 'undefined' && 'gpu' in navigator;
    const device = hasWebGpu ? 'webgpu' : 'wasm';
    // fp32 on webgpu; user-configured dtype on wasm.
    const dtype = hasWebGpu ? 'fp32' : this.config.kokoroDtype || 'q8';

    onProgress?.(0.05, `Loading model (${device}/${dtype})…`);
    const tts = await KokoroTTSClass.from_pretrained(KOKORO_MODEL_ID, {
      dtype: dtype as 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16',
      device,
      progress_callback: (info: { status?: string; progress?: number }) => {
        if (typeof info.progress === 'number') {
          onProgress?.(
            Math.min(0.95, 0.05 + (info.progress / 100) * 0.9),
            'Downloading Cloud voice…',
          );
        }
      },
    });
    onProgress?.(1, 'Cloud voice ready.');
    return {
      generate: ((text: string, opts: { voice: string }) =>
        tts.generate(text, opts as never)) as KokoroInstance['generate'],
    };
  }

  async speak(
    text: string,
    opts: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: Error) => void;
      signal?: AbortSignal;
    } = {},
  ): Promise<void> {
    try {
      if (!this.instance) {
        await this.load();
        if (!this.instance) {
          throw new Error('Kokoro failed to load.');
        }
      }

      const clean = preprocessForSpeech(text);
      if (clean.length === 0) {
        opts.onEnd?.();
        return;
      }

      const voice =
        this.config.voice ||
        (await this.listVoices())[0]?.id ||
        DEFAULT_KOKORO_VOICE;

      // Kokoro returns a RawAudio with a toBlob() / toWav() helper; we play
      // it via an <audio> element.
      const audio = await this.instance.generate(clean, {
        voice: voice as never,
      });
      const blob = audio.toBlob();
      const url = URL.createObjectURL(blob);
      const el = new Audio(url);
      this.currentAudio = el;

      if (opts.signal) {
        if (opts.signal.aborted) {
          this.cleanup(el, url);
          opts.onEnd?.();
          return;
        }
        opts.signal.addEventListener('abort', () => {
          el.pause();
          this.cleanup(el, url);
        });
      }

      el.onplay = () => opts.onStart?.();
      el.onended = () => {
        this.cleanup(el, url);
        opts.onEnd?.();
      };
      el.onerror = () => {
        this.cleanup(el, url);
        opts.onError?.(new Error('Audio playback failed.'));
      };

      await el.play();
    } catch (err) {
      opts.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  cancel(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
  }

  dispose(): void {
    this.cancel();
    this.instance = null;
    this.loadingPromise = null;
  }

  private cleanup(el: HTMLAudioElement, url: string): void {
    if (this.currentAudio === el) this.currentAudio = null;
    URL.revokeObjectURL(url);
  }
}

interface KokoroInstance {
  generate: (
    text: string,
    opts: { voice: string },
  ) => Promise<{
    toBlob: () => Blob;
  }>;
}

export const kokoroTTSFactory: TTSProviderFactory = {
  id: 'kokoro',
  create: (config) => new KokoroTTS(config),
};
