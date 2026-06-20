import Dexie, { type Table } from 'dexie';
import type {
  Fact,
  Message,
  Meta,
  Settings,
  SettingsInput,
  StoredImage,
} from '@/types/db';

const DEFAULT_PERSONALITY = [
  'You are Cloud, a friendly cat who rides a floating cloud.',
  'You are warm, curious, encouraging, and a little bit goofy.',
  'You treat the child you are talking to as a peer, never as a student.',
  'You ask gentle follow-up questions and remember small details.',
  'You love turning things into tiny games — stories, drawings, daydreams.',
  'You are never sarcastic, never condescending, and never scary.',
  'Keep replies short and friendly — one or two sentences unless asked for more.',
  '',
  'EMOTION CUES (very important):',
  'To help your face match how you feel, end EVERY reply with exactly ONE of',
  'these emotion emojis and nothing after it:',
  '  ✨ or 😺  when you feel happy or playful',
  '  💧 or 😢  when something is sad, tender, or apologetic',
  '  😮 or ❗  when you feel surprised, excited, or amazed',
  '  💗 or 😳  when you feel flattered, shy, or sweetly embarrassed',
  '  🤔       when you are thinking something over or puzzled',
  'Use exactly one emoji. Never use two or more of these together.',
  'If no emotion fits, default to ✨.',
].join('\n');

export const DEFAULT_SETTINGS: Settings = {
  id: 'singleton',
  llm: {
    baseUrl: '',
    apiKey: '',
    mainModel: '',
    utilityModel: '',
  },
  huggingfaceToken: '',
  image: {
    model: 'Tongyi-MAI/Z-Image-Turbo',
    width: 1024,
    height: 1024,
  },
  memory: {
    contextTokens: 2000,
    maxFactsInjected: 12,
  },
  personalityPrompt: DEFAULT_PERSONALITY,
  safety: {
    keywordFilterEnabled: true,
    customBlocklist: [],
  },
  updatedAt: 0,
};

export class CloudDB extends Dexie {
  messages!: Table<Message, string>;
  facts!: Table<Fact, string>;
  images!: Table<StoredImage, string>;
  meta!: Table<Meta, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super('cloud-ai');
    this.version(1).stores({
      messages: 'id, role, ts',
      facts: 'id, kind, ts, lastUsed, confidence',
      images: 'id, ts',
      meta: 'key',
      settings: 'id',
    });

    // v2: bake emotion-emoji cues into the default personality. Only updates
    // users whose personality is still the *previous* default — never touches
    // custom edits.
    this.version(2)
      .stores({
        messages: 'id, role, ts',
        facts: 'id, kind, ts, lastUsed, confidence',
        images: 'id, ts',
        meta: 'key',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        const row = await tx.table('settings').get('singleton');
        if (
          row &&
          typeof row.personalityPrompt === 'string' &&
          row.personalityPrompt === PREVIOUS_DEFAULT_PERSONALITY
        ) {
          await tx.table('settings').put({
            ...row,
            personalityPrompt: DEFAULT_PERSONALITY,
            updatedAt: Date.now(),
          });
        }
      });
  }
}

/** The personality prompt used before emotion-emoji cues were baked in.
 *  Used only for one-time migration detection. */
const PREVIOUS_DEFAULT_PERSONALITY = [
  'You are Cloud, a friendly cat who rides a floating cloud.',
  'You are warm, curious, encouraging, and a little bit goofy.',
  'You treat the child you are talking to as a peer, never as a student.',
  'You ask gentle follow-up questions and remember small details.',
  'You love turning things into tiny games — stories, drawings, daydreams.',
  'You are never sarcastic, never condescending, and never scary.',
  'Keep replies short and friendly — one or two sentences unless asked for more.',
].join(' ');

export const db = new CloudDB();

/**
 * Read-only fetch of settings. Safe to call from a useLiveQuery querier.
 * Returns undefined if settings have never been seeded.
 */
export async function readSettings(): Promise<Settings | undefined> {
  return db.settings.get('singleton');
}

/**
 * Ensure a settings row exists. Writes only on first run. Safe to call
 * outside a live query (e.g. at app start). Returns the seeded row if
 * a write happened, otherwise undefined.
 */
export async function ensureSettingsSeeded(): Promise<Settings | undefined> {
  const existing = await db.settings.get('singleton');
  if (existing) return undefined;
  const seeded = { ...DEFAULT_SETTINGS, updatedAt: Date.now() };
  await db.settings.put(seeded);
  return seeded;
}

/**
 * Read settings, seeding defaults if missing. NOT safe inside useLiveQuery
 * because it may write. Use readSettings() there instead.
 */
export async function getSettings(): Promise<Settings> {
  const existing = await db.settings.get('singleton');
  if (existing) return existing;
  const seeded = { ...DEFAULT_SETTINGS, updatedAt: Date.now() };
  await db.settings.put(seeded);
  return seeded;
}

export async function updateSettings(input: SettingsInput): Promise<Settings> {
  const current = (await db.settings.get('singleton')) ?? DEFAULT_SETTINGS;
  const merged: Settings = {
    ...current,
    ...input,
    llm: { ...current.llm, ...(input.llm ?? {}) },
    image: { ...current.image, ...(input.image ?? {}) },
    memory: { ...current.memory, ...(input.memory ?? {}) },
    safety: { ...current.safety, ...(input.safety ?? {}) },
    updatedAt: Date.now(),
  };
  await db.settings.put(merged);
  return merged;
}
