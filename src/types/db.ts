export type Role = 'system' | 'user' | 'assistant';

export type Emotion =
  | 'idle'
  | 'happy'
  | 'sad'
  | 'surprise'
  | 'blush'
  | 'thinking'
  | 'talking';

export interface Message {
  id: string;
  role: Role;
  content: string;
  emotion?: Emotion;
  imageId?: string;
  ts: number;
}

export type FactKind = 'preference' | 'event' | 'person' | 'interest';

export interface Fact {
  id: string;
  kind: FactKind;
  text: string;
  confidence: number;
  ts: number;
  lastUsed: number;
  source?: 'extracted' | 'manual';
}

export interface StoredImage {
  id: string;
  prompt: string;
  blob: Blob;
  ts: number;
}

export interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  mainModel: string;
  utilityModel: string;
}

export interface ImageConfig {
  model: string;
  width: number;
  height: number;
}

export interface SafetyConfig {
  keywordFilterEnabled: boolean;
  customBlocklist: string[];
}

export interface MemoryConfig {
  contextTokens: number;
  maxFactsInjected: number;
}

/** Which TTS engine to use. */
export type TTSProvider = 'web-speech' | 'kokoro';

export interface TTSConfig {
  provider: TTSProvider;
  /** Voice name for the active provider (Web Speech voiceURI or Kokoro voice id). */
  voice: string;
  /** Playback rate, 0.5–2.0. Default 1. */
  rate: number;
  /** Pitch for Web Speech only, 0–2. Default 1. */
  pitch: number;
  /** Kokoro quantization, e.g. 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16'. */
  kokoroDtype: string;
}

/** Which STT engine to use. */
export type STTProvider = 'web-speech';

export interface STTConfig {
  provider: STTProvider;
  /** BCP-47 language tag, e.g. 'en-US'. */
  lang: string;
}

export interface Settings {
  id: 'singleton';
  llm: LLMConfig;
  huggingfaceToken: string;
  image: ImageConfig;
  memory: MemoryConfig;
  personalityPrompt: string;
  safety: SafetyConfig;
  tts: TTSConfig;
  stt: STTConfig;
  updatedAt: number;
}

export type SettingsInput = Partial<Omit<Settings, 'id' | 'updatedAt'>>;

export interface Meta {
  key: string;
  value: unknown;
}
