import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '@/lib/storage/db';
import { useMessages, useSettings } from '@/lib/storage/hooks';
import { selectContextWindow } from '@/lib/memory/context';
import { extractFactsFromMessages } from '@/lib/memory/extract';
import { markFactsUsed, upsertFacts } from '@/lib/memory/store';
import { rankFacts } from '@/lib/memory/rank';
import {
  buildSystemPrompt,
  isInputSafe,
  isOutputSafe,
} from '@/lib/safety/prompt';
import { inferEmotionFromReply, randomBoopEmotion } from '@/lib/cloud/emotion';
import { parseImageMarker, stripImageMarkerDraft } from '@/lib/image/marker';
import { streamChat, type ChatTurn } from '@/lib/llm/stream';
import { buildStoryPrompt } from '@/lib/story/prompt';
import { incrementStoryTurns, type StoryState } from '@/lib/story/state';
import { awardSticker } from '@/lib/stickers/store';
import type { Emotion, Message, Settings } from '@/types/db';

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

interface UseChatResult {
  messages: Message[];
  settings: Settings | undefined;
  streaming: boolean;
  cloudEmotion: Emotion;
  error: string | null;
  /** True when settings look usable (enough to attempt a chat request). */
  ready: boolean;
  send: (text: string) => Promise<void>;
  cancel: () => void;
  clearError: () => void;
  /** Trigger a brief random cute reaction (tap on Cloud). */
  boop: () => void;
  /** Last structured image request emitted by Cloud, consumed by AppShell. */
  pendingImageRequest: { messageId: string; prompt: string } | null;
  clearPendingImageRequest: () => void;
}

export function useChat(story?: StoryState): UseChatResult {
  const messages = useMessages();
  const settings = useSettings();
  const [streaming, setStreaming] = useState(false);
  const [cloudEmotion, setCloudEmotion] = useState<Emotion>('idle');
  const [error, setError] = useState<string | null>(null);
  const [pendingImageRequest, setPendingImageRequest] = useState<{
    messageId: string;
    prompt: string;
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const boopTimerRef = useRef<number | null>(null);
  const emotionBeforeBoopRef = useRef<Emotion | null>(null);

  const ready =
    !!settings &&
    settings.llm.baseUrl.trim().length > 0 &&
    settings.llm.apiKey.trim().length > 0 &&
    settings.llm.mainModel.trim().length > 0;

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    setCloudEmotion('idle');
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const boop = useCallback(() => {
    // Don't interrupt an active stream — let the conversation drive emotion.
    if (streaming) return;
    if (boopTimerRef.current !== null) {
      window.clearTimeout(boopTimerRef.current);
    } else {
      emotionBeforeBoopRef.current = cloudEmotion;
    }
    const next = randomBoopEmotion();
    setCloudEmotion(next);
    boopTimerRef.current = window.setTimeout(() => {
      setCloudEmotion(emotionBeforeBoopRef.current ?? 'idle');
      emotionBeforeBoopRef.current = null;
      boopTimerRef.current = null;
    }, 1400);
  }, [streaming, cloudEmotion]);

  useEffect(() => {
    return () => {
      if (boopTimerRef.current !== null) {
        window.clearTimeout(boopTimerRef.current);
      }
    };
  }, []);

  const send = useCallback(
    async (text: string) => {
      if (!settings) {
        setError('Settings not loaded yet.');
        return;
      }

      const trimmed = text.trim();
      if (trimmed.length === 0) return;

      const safety = isInputSafe(trimmed, settings);
      if (!safety.ok) {
        setError(safety.reason ?? 'Not allowed.');
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setError(null);
      setStreaming(true);
      setCloudEmotion('thinking');

      const now = Date.now();
      const userMsg: Message = {
        id: newId(),
        role: 'user',
        content: trimmed,
        ts: now,
      };
      const cloudMsg: Message = {
        id: newId(),
        role: 'assistant',
        content: '',
        emotion: 'thinking',
        ts: now + 1,
      };

      await db.messages.bulkPut([userMsg, cloudMsg]);
      void awardSticker('first-chat');

      try {
        const result = await runTurn({
          priorMessages: messages,
          settings,
          story,
          userMsg,
          cloudMsg,
          signal: controller.signal,
          onPartial: (partial) => {
            void db.messages.update(cloudMsg.id, { content: partial });
            setCloudEmotion('talking');
          },
        });
        setCloudEmotion(result.emotion);
        if (result.imagePrompt) {
          setPendingImageRequest({
            messageId: cloudMsg.id,
            prompt: result.imagePrompt,
          });
        }
      } catch (err) {
        const aborted = err instanceof Error && err.name === 'AbortError';
        if (!aborted) {
          const msg =
            err instanceof Error ? err.message : 'Something went wrong.';
          setError(msg);
          await db.messages.update(cloudMsg.id, {
            content: 'Hmm, I got tangled up. Try again in a moment? 🌥️',
            emotion: 'sad',
          });
          setCloudEmotion('sad');
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, settings, story],
  );

  return {
    messages,
    settings,
    streaming,
    cloudEmotion,
    error,
    ready,
    send,
    cancel,
    clearError,
    boop,
    pendingImageRequest,
    clearPendingImageRequest: () => setPendingImageRequest(null),
  };
}

interface RunTurnArgs {
  priorMessages: Message[];
  settings: Settings;
  story?: StoryState;
  userMsg: Message;
  cloudMsg: Message;
  signal: AbortSignal;
  onPartial: (partial: string) => void;
}

async function runTurn(
  args: RunTurnArgs,
): Promise<{ emotion: Emotion; imagePrompt: string | null }> {
  const { priorMessages, settings, userMsg, cloudMsg, signal, onPartial } =
    args;
  const story = args.story;

  const all = [...priorMessages, userMsg];
  const { included, evicted } = selectContextWindow(
    all,
    settings.memory.contextTokens,
  );

  if (evicted.length > 0) {
    const extracted = await extractFactsFromMessages(
      evicted,
      settings.llm,
    ).catch(() => []);
    if (extracted.length > 0) await upsertFacts(extracted);
  }

  const allFacts = await db.facts.toArray();
  const ranked = rankFacts(allFacts);
  const { system, injectedFacts } = buildSystemPrompt(settings, ranked);
  const storyPrompt = story?.active ? buildStoryPrompt(story) : '';

  const turns: ChatTurn[] = [
    {
      role: 'system',
      content: storyPrompt ? `${system}\n\n${storyPrompt}` : system,
    },
    ...included.map((m) => ({ role: m.role, content: m.content }) as ChatTurn),
  ];

  let accumulated = '';
  const stream = await streamChat({
    config: settings.llm,
    messages: turns,
    signal,
    temperature: 0.7,
  });

  for await (const chunk of stream) {
    accumulated += chunk;
    onPartial(stripImageMarkerDraft(accumulated));
  }

  const parsed = parseImageMarker(accumulated);
  const visibleContent =
    parsed.content ||
    (parsed.prompt ? "I'll draw that for you! ✨" : accumulated);

  // If the reply tripped the safety backstop, Cloud looks apologetic
  // regardless of the inferred emotion — it signals something's off.
  const finalEmotion: Emotion = isOutputSafe(visibleContent, settings)
    ? inferEmotionFromReply(visibleContent)
    : 'sad';
  await db.messages.update(cloudMsg.id, {
    content: visibleContent,
    emotion: finalEmotion,
  });

  if (injectedFacts.length > 0) await markFactsUsed(injectedFacts);
  if (story?.active) await incrementStoryTurns();

  return { emotion: finalEmotion, imagePrompt: parsed.prompt };
}
