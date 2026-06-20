import type { TTSConfig } from '@/types/db';

export interface SpeakOptions {
  /** Called continuously while speaking (for mouth animation). */
  onBoundary?: (charIndex: number) => void;
  /** Called once when playback actually starts. */
  onStart?: () => void;
  /** Called once when playback ends naturally. */
  onEnd?: () => void;
  /** Called if playback fails or is unavailable. */
  onError?: (err: Error) => void;
  signal?: AbortSignal;
}

export interface TTSProvider {
  readonly id: string;
  /** Human-friendly name for settings UI. */
  readonly label: string;
  /** True if this provider can be used right now (deps loaded, etc). */
  isAvailable(): Promise<boolean>;
  /** List voice ids this provider supports, if enumerable. */
  listVoices?(): Promise<VoiceInfo[]>;
  /** Speak text. Resolves when playback ends. Cancellable via signal. */
  speak(text: string, opts?: SpeakOptions): Promise<void>;
  /** Stop any in-flight playback immediately. */
  cancel(): void;
  /** Release any heavyweight resources (models, audio graph). */
  dispose?(): void;
}

export interface VoiceInfo {
  id: string;
  label: string;
  /** Optional gender hint ('female' | 'male' | 'neutral'). */
  gender?: 'female' | 'male' | 'neutral';
}

export interface TTSProviderFactory {
  /** Stable provider id matching TTSConfig.provider values. */
  readonly id: string;
  /** Create a provider instance bound to the given config. */
  create(config: TTSConfig): TTSProvider;
}

/**
 * Strip markdown and trailing emotion emoji before sending to TTS.
 * Returns plain text suitable for reading aloud.
 */
export function preprocessForSpeech(text: string): string {
  let out = text;
  // Remove markdown emphasis/strong markers.
  out = out.replace(/\*\*(.+?)\*\*/g, '$1');
  out = out.replace(/__(.+?)__/g, '$1');
  out = out.replace(/\*(.+?)\*/g, '$1');
  out = out.replace(/_(.+?)_/g, '$1');
  // Remove inline code backticks.
  out = out.replace(/`([^`]+)`/g, '$1');
  // Strip emoji via the Unicode pictographic / symbol ranges. We omit the
  // variation selector (FE0F) and zero-width joiner (200D) because including
  // combining marks inside a character class confuses regex engines; leftover
  // combining marks don't affect speech synthesis.
  const emojiRange =
    '\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}';
  out = out.replace(new RegExp(`[${emojiRange}]`, 'gu'), '');
  // Collapse extra whitespace.
  return out.replace(/\s+/g, ' ').trim();
}
