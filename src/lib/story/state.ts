import { db } from '@/lib/storage/db';

export interface StoryState {
  active: boolean;
  title: string;
  startedAt: number | null;
  turns: number;
}

const STORY_META_KEY = 'story-state';

export const DEFAULT_STORY_STATE: StoryState = {
  active: false,
  title: '',
  startedAt: null,
  turns: 0,
};

export async function getStoryState(): Promise<StoryState> {
  const row = await db.meta.get(STORY_META_KEY);
  if (!row) return DEFAULT_STORY_STATE;
  return { ...DEFAULT_STORY_STATE, ...(row.value as Partial<StoryState>) };
}

export async function setStoryState(state: StoryState): Promise<void> {
  await db.meta.put({ key: STORY_META_KEY, value: state });
}

export async function startStory(title: string): Promise<StoryState> {
  const state: StoryState = {
    active: true,
    title: title.trim() || 'Cloud Story',
    startedAt: Date.now(),
    turns: 0,
  };
  await setStoryState(state);
  return state;
}

export async function endStory(): Promise<void> {
  await setStoryState(DEFAULT_STORY_STATE);
}

export async function incrementStoryTurns(): Promise<void> {
  const current = await getStoryState();
  if (!current.active) return;
  await setStoryState({ ...current, turns: current.turns + 1 });
}
