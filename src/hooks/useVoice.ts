import { useCallback, useEffect, useRef, useState } from 'react';
import { getSTTProvider } from '@/lib/providers/stt/registry';
import { applyConfig, getTTSProvider } from '@/lib/providers/tts/registry';
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
    const provider = getTTSProvider(settings.tts);
    applyConfig(provider, settings.tts);
  }, [settings]);

  const stopSpeaking = useCallback(() => {
    if (!settings) return;
    ttsAbortRef.current?.abort();
    ttsAbortRef.current = null;
    getTTSProvider(settings.tts).cancel();
    setSpeakingMessageId(null);
  }, [settings]);

  const speakMessage = useCallback(
    async (messageId: string, text: string) => {
      if (!settings) return;
      const provider = getTTSProvider(settings.tts);
      applyConfig(provider, settings.tts);
      stopSpeaking();

      const controller = new AbortController();
      ttsAbortRef.current = controller;
      setError(null);
      setSpeakingMessageId(messageId);

      await provider.speak(text, {
        signal: controller.signal,
        onStart: () => setSpeakingMessageId(messageId),
        onEnd: () => setSpeakingMessageId(null),
        onError: (err) => {
          setError(err.message);
          setSpeakingMessageId(null);
        },
      });
    },
    [settings, stopSpeaking],
  );

  const stopListening = useCallback(() => {
    if (!settings) return;
    getSTTProvider(settings.stt).stop();
  }, [settings]);

  const listenOnce = useCallback(async (): Promise<string> => {
    if (!settings) return '';
    const provider = getSTTProvider(settings.stt);
    (
      provider as typeof provider & { updateConfig?: (c: STTConfig) => void }
    ).updateConfig?.(settings.stt);
    setListening(true);
    setTranscriptPreview('');
    setError(null);
    try {
      const result = await provider.listen({
        onPartial: setTranscriptPreview,
        onError: (err) => setError(err.message),
      });
      return result.text;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
        getTTSProvider(settings.tts).cancel();
        getSTTProvider(settings.stt).stop();
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
