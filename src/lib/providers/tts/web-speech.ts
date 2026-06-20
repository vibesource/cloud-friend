import type { TTSConfig } from '@/types/db';
import {
  preprocessForSpeech,
  type TTSProvider,
  type TTSProviderFactory,
  type VoiceInfo,
} from './types';

/**
 * Web Speech API (SpeechSynthesis) provider. Built into all major browsers,
 * zero setup, zero latency. Voice quality varies by OS.
 */
class WebSpeechTTS implements TTSProvider {
  readonly id = 'web-speech';
  readonly label = 'Browser voices (Web Speech API)';
  private config: TTSConfig;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor(config: TTSConfig) {
    this.config = config;
  }

  /** Whether an utterance is currently in-flight. Exposed for tests/inspection. */
  get isSpeaking(): boolean {
    return this.currentUtterance !== null;
  }

  async isAvailable(): Promise<boolean> {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  async listVoices(): Promise<VoiceInfo[]> {
    if (!('speechSynthesis' in window)) return [];
    // Voices load asynchronously in some browsers; poll briefly.
    const voices = await waitForVoices(10);
    return voices.map((v) => ({
      id: v.voiceURI,
      label: `${v.name} (${v.lang})`,
      gender: detectGender(v.name),
    }));
  }

  updateConfig(config: TTSConfig): void {
    this.config = config;
  }

  async speak(
    text: string,
    opts: {
      onBoundary?: (charIndex: number) => void;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: Error) => void;
      signal?: AbortSignal;
    } = {},
  ): Promise<void> {
    if (!('speechSynthesis' in window)) {
      opts.onError?.(
        new Error('Speech synthesis not supported in this browser.'),
      );
      return;
    }
    const clean = preprocessForSpeech(text);
    if (clean.length === 0) {
      opts.onEnd?.();
      return;
    }

    // Cancel anything currently playing (also resets a stuck synth).
    this.cancel();

    const u = new SpeechSynthesisUtterance(clean);
    u.rate = clamp(this.config.rate, 0.5, 2);
    u.pitch = clamp(this.config.pitch, 0, 2);
    u.volume = 1;
    u.onboundary = (e) => opts.onBoundary?.(e.charIndex);
    u.onstart = () => opts.onStart?.();
    u.onend = () => {
      this.currentUtterance = null;
      opts.onEnd?.();
    };
    u.onerror = (e) => {
      this.currentUtterance = null;
      // 'interrupted' / 'canceled' fire when we deliberately cancel; ignore.
      if (e.error === 'interrupted' || e.error === 'canceled') {
        opts.onEnd?.();
        return;
      }
      opts.onError?.(new Error(`Speech error: ${e.error}`));
    };

    // Pick a voice: explicit, else heuristic for a friendly female one.
    const voices = await waitForVoices(5);
    const chosen =
      (this.config.voice &&
        voices.find((v) => v.voiceURI === this.config.voice)) ||
      pickDefaultVoice(voices);
    if (chosen) {
      u.voice = chosen;
      u.lang = chosen.lang;
    }

    this.currentUtterance = u;

    if (opts.signal) {
      if (opts.signal.aborted) {
        this.cancel();
        opts.onEnd?.();
        return;
      }
      opts.signal.addEventListener('abort', () => {
        this.cancel();
      });
    }

    window.speechSynthesis.speak(u);
  }

  cancel(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;
  }
}

export const webSpeechTTSFactory: TTSProviderFactory = {
  id: 'web-speech',
  create: (config) => new WebSpeechTTS(config),
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function waitForVoices(maxAttempts: number): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve([]);
      return;
    }
    const immediate = window.speechSynthesis.getVoices();
    if (immediate.length > 0) {
      resolve(immediate);
      return;
    }
    let attempts = 0;
    const tryAgain = () => {
      attempts += 1;
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0 || attempts >= maxAttempts) {
        window.speechSynthesis.removeEventListener('voiceschanged', tryAgain);
        resolve(v);
      }
    };
    window.speechSynthesis.addEventListener('voiceschanged', tryAgain);
    setTimeout(tryAgain, 100);
  });
}

function pickDefaultVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined {
  if (voices.length === 0) return undefined;
  // Prefer English, then any, with a bias toward names that sound friendly.
  const english = voices.filter((v) => v.lang.startsWith('en'));
  const pool = english.length > 0 ? english : voices;
  const hints = [
    'samantha',
    'aria',
    'jenny',
    'female',
    'google uk english female',
  ];
  for (const hint of hints) {
    const match = pool.find((v) => v.name.toLowerCase().includes(hint));
    if (match) return match;
  }
  return pool[0];
}

function detectGender(name: string): 'female' | 'male' | 'neutral' {
  const lower = name.toLowerCase();
  if (/(female|samantha|aria|jenny|zira|fiona|karen|tessa|veena)/.test(lower)) {
    return 'female';
  }
  if (/(male|daniel|alex|fred|david|rishi|thomas)/.test(lower)) {
    return 'male';
  }
  return 'neutral';
}
