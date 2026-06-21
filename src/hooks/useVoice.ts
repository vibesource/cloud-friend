import { useCallback, useEffect, useRef, useState } from 'react';
import { getSTTProvider } from '@/lib/providers/stt/registry';
import { applyConfig, getTTSProvider } from '@/lib/providers/tts/registry';
import { DEFAULT_SETTINGS } from '@/lib/storage/db';
import { friendlyErrorMessage } from '@/lib/errors';
import { awardSticker } from '@/lib/stickers/store';
import type { STTConfig, Settings } from '@/types/db';

interface UseVoiceResult {
  speakingMessageId: string | null;
  listening: boolean;
  transcriptPreview: string;
  error: string | null;
  speakMessage: (messageId: string, text: string) => Promise<void>;
  stopSpeaking: () => void;
  listenOnce: () => Promise<string>;
  stopListening: () => void;
  clearVoiceError: () => void;
}

export function useVoice(settings: Settings | undefined): UseVoiceResult {
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(
    null,
  );
  const [listening, setListening] = useState(false);
  const [transcriptPreview, setTranscriptPreview] = useState('');
  const [error, setError] = useState<string | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!settings) return;
    const ttsConfig = settings.tts ?? DEFAULT_SETTINGS.tts;
    const provider = getTTSProvider(ttsConfig);
    applyConfig(provider, ttsConfig);
  }, [settings]);

  const stopSpeaking = useCallback(() => {
    if (!settings) return;
    ttsAbortRef.current?.abort();
    ttsAbortRef.current = null;
    getTTSProvider(settings.tts ?? DEFAULT_SETTINGS.tts).cancel();
    setSpeakingMessageId(null);
  }, [settings]);

  const speakMessage = useCallback(
    async (messageId: string, text: string) => {
      if (!settings) return;
      const ttsConfig = settings.tts ?? DEFAULT_SETTINGS.tts;
      const provider = getTTSProvider(ttsConfig);
      applyConfig(provider, ttsConfig);
      stopSpeaking();

      const controller = new AbortController();
      ttsAbortRef.current = controller;
      setError(null);
      setSpeakingMessageId(messageId);

      await provider.speak(text, {
        signal: controller.signal,
        onStart: () => {
          setSpeakingMessageId(messageId);
          void awardSticker('first-voice');
        },
        onEnd: () => setSpeakingMessageId(null),
        onError: (err) => {
          setError(friendlyErrorMessage(err));
          setSpeakingMessageId(null);
        },
      });
    },
    [settings, stopSpeaking],
  );

  const stopListening = useCallback(() => {
    if (!settings) return;
    getSTTProvider(settings.stt ?? DEFAULT_SETTINGS.stt).stop();
  }, [settings]);

  const listenOnce = useCallback(async (): Promise<string> => {
    if (!settings) return '';
    const sttConfig = settings.stt ?? DEFAULT_SETTINGS.stt;
    const provider = getSTTProvider(sttConfig);
    (
      provider as typeof provider & { updateConfig?: (c: STTConfig) => void }
    ).updateConfig?.(sttConfig);
    setListening(true);
    setTranscriptPreview('');
    setError(null);
    try {
      const result = await provider.listen({
        onPartial: setTranscriptPreview,
        onError: (err) => setError(friendlyErrorMessage(err)),
      });
      return result.text;
    } catch (err) {
      setError(friendlyErrorMessage(err));
      return '';
    } finally {
      setListening(false);
      setTranscriptPreview('');
    }
  }, [settings]);

  useEffect(() => {
    return () => {
      ttsAbortRef.current?.abort();
      if (settings) {
        getTTSProvider(settings.tts ?? DEFAULT_SETTINGS.tts).cancel();
        getSTTProvider(settings.stt ?? DEFAULT_SETTINGS.stt).stop();
      }
    };
  }, [settings]);

  return {
    speakingMessageId,
    listening,
    transcriptPreview,
    error,
    speakMessage,
    stopSpeaking,
    listenOnce,
    stopListening,
    clearVoiceError: () => setError(null),
  };
}
