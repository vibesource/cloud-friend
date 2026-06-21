import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  DEFAULT_STORY_STATE,
  endStory,
  getStoryState,
  startStory,
  type StoryState,
} from '@/lib/story/state';

interface UseStoryModeResult {
  state: StoryState;
  start: (title: string) => Promise<void>;
  end: () => Promise<void>;
}

export function useStoryMode(): UseStoryModeResult {
  const state =
    useLiveQuery(() => getStoryState(), [], DEFAULT_STORY_STATE) ??
    DEFAULT_STORY_STATE;

  const start = useCallback(async (title: string) => {
    await startStory(title);
  }, []);

  const end = useCallback(async () => {
    await endStory();
  }, []);

  return { state, start, end };
}
