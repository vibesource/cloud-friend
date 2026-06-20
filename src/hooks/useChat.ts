import { useCallback, useRef, useState } from 'react';
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
import { streamChat, type ChatTurn } from '@/lib/llm/stream';
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
}

export function useChat(): UseChatResult {
  const messages = useMessages();
  const settings = useSettings();
  const [streaming, setStreaming] = useState(false);
  const [cloudEmotion, setCloudEmotion] = useState<Emotion>('idle');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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

      try {
        await runTurn({
          priorMessages: messages,
          settings,
          userMsg,
          cloudMsg,
          signal: controller.signal,
          onPartial: (partial) => {
            void db.messages.update(cloudMsg.id, { content: partial });
            setCloudEmotion('talking');
          },
        });
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
        }
      } finally {
        setStreaming(false);
        setCloudEmotion('idle');
        abortRef.current = null;
      }
    },
    [messages, settings],
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
  };
}

interface RunTurnArgs {
  priorMessages: Message[];
  settings: Settings;
  userMsg: Message;
  cloudMsg: Message;
  signal: AbortSignal;
  onPartial: (partial: string) => void;
}

async function runTurn(args: RunTurnArgs): Promise<void> {
  const { priorMessages, settings, userMsg, cloudMsg, signal, onPartial } =
    args;

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

  const turns: ChatTurn[] = [
    { role: 'system', content: system },
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
    onPartial(accumulated);
  }

  const finalEmotion: Emotion = isOutputSafe(accumulated, settings)
    ? 'happy'
    : 'sad';
  await db.messages.update(cloudMsg.id, {
    content: accumulated,
    emotion: finalEmotion,
  });

  if (injectedFacts.length > 0) await markFactsUsed(injectedFacts);
}
