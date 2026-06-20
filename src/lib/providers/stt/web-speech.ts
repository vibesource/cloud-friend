import type { STTConfig } from '@/types/db';
import type {
  ListenOptions,
  ListenResult,
  STTProvider,
  STTProviderFactory,
} from './types';

// Minimal ambient type defs for Web Speech Recognition (not in TS lib by default).
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
  readonly message: string;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: ((e: Event) => void) | null;
  onstart: ((e: Event) => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  return (
    (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor })
      .SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor })
      .webkitSpeechRecognition ||
    null
  );
}

class WebSpeechSTT implements STTProvider {
  readonly id = 'web-speech';
  readonly label = 'Browser microphone (Web Speech API)';
  private config: STTConfig;
  private recognizer: SpeechRecognitionLike | null = null;
  private activePromise: {
    resolve: (r: ListenResult) => void;
    reject: (e: Error) => void;
  } | null = null;
  private accumulated = '';

  constructor(config: STTConfig) {
    this.config = config;
  }

  updateConfig(config: STTConfig): void {
    this.config = config;
  }

  async isAvailable(): Promise<boolean> {
    return getRecognitionCtor() !== null;
  }

  listen(opts: ListenOptions): Promise<ListenResult> {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      const err = new Error(
        'Speech recognition not supported in this browser. Try Chrome or Edge.',
      );
      opts.onError?.(err);
      return Promise.reject(err);
    }

    // One session at a time.
    this.stop();

    const r = new Ctor();
    r.lang = this.config.lang || 'en-US';
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    this.accumulated = '';

    const promise = new Promise<ListenResult>((resolve, reject) => {
      this.activePromise = { resolve, reject };

      r.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          const text = res[0]?.transcript ?? '';
          if (res.isFinal) {
            this.accumulated += (this.accumulated ? ' ' : '') + text.trim();
          } else {
            interim += text;
          }
        }
        opts.onPartial?.(
          [this.accumulated, interim].filter(Boolean).join(' ').trim(),
        );
      };

      r.onerror = (e) => {
        // 'no-speech' and 'aborted' are normal end-of-session signals;
        // don't reject — resolve with whatever was captured.
        if (e.error === 'no-speech' || e.error === 'aborted') {
          return;
        }
        const err = new Error(`Speech recognition error: ${e.error}`);
        opts.onError?.(err);
        this.activePromise?.reject(err);
        this.activePromise = null;
      };

      r.onend = () => {
        const final = this.accumulated.trim();
        this.activePromise?.resolve({ text: final });
        this.activePromise = null;
      };
    });

    this.recognizer = r;
    try {
      r.start();
    } catch (err) {
      // start() throws if already started; safe to ignore.
      void err;
    }
    return promise;
  }

  stop(): void {
    if (this.recognizer) {
      try {
        this.recognizer.stop();
      } catch {
        // Already stopped — ignore.
      }
      this.recognizer = null;
    }
  }
}

export const webSpeechSTTFactory: STTProviderFactory = {
  id: 'web-speech',
  create: (config) => new WebSpeechSTT(config),
};
