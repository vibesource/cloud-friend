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

export interface Settings {
  id: 'singleton';
  llm: LLMConfig;
  huggingfaceToken: string;
  image: ImageConfig;
  memory: MemoryConfig;
  personalityPrompt: string;
  safety: SafetyConfig;
  updatedAt: number;
}

export type SettingsInput = Partial<Omit<Settings, 'id' | 'updatedAt'>>;

export interface Meta {
  key: string;
  value: unknown;
}
