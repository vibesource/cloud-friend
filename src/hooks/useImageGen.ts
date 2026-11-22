import { useCallback, useEffect, useRef, useState } from 'react';
import { applyConfig, getImageProvider } from '@/lib/providers/image/registry';
import { wrapImagePrompt } from '@/lib/safety/image';
import { awardSticker } from '@/lib/stickers/store';
import { friendlyErrorMessage } from '@/lib/errors';
import { storeImageForMessage } from '@/hooks/useImageUrl';
import type { Settings } from '@/types/db';

interface UseImageGenResult {
  /** Message id currently generating an image, if any. */
  generatingForMessageId: string | null;
  cancelledForMessageId: string | null;
  error: string | null;
  /** Generate an image and attach it to the given assistant message. */
  generateForMessage(messageId: string, rawPrompt: string): Promise<void>;
  cancel(): void;
  clearError(): void;
}

export function useImageGen(settings: Settings | undefined): UseImageGenResult {
  const [generatingForMessageId, setGeneratingForMessageId] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelledForMessageId, setCancelledForMessageId] = useState<
    string | null
  >(null);
  const activeRef = useRef<{
    controller: AbortController;
    messageId: string;
  } | null>(null);

  useEffect(() => {
    if (!settings) return;
    const deps = {
      apiKey: settings.huggingfaceToken,
      image: settings.image,
    };
    applyConfig(getImageProvider(deps), deps);
  }, [settings]);

  const cancel = useCallback(() => {
    const active = activeRef.current;
    if (!active) return;
    active.controller.abort();
    activeRef.current = null;
    setCancelledForMessageId(active.messageId);
    setGeneratingForMessageId(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const generateForMessage = useCallback(
    async (messageId: string, rawPrompt: string) => {
      if (!settings) return;
      if (activeRef.current) {
        setError(
          'Cloud is already drawing. Please wait or stop that drawing first.',
        );
        return;
      }

      // Reject silently if the wrapped prompt is empty or unsafe.
      const wrapped = wrapImagePrompt(rawPrompt, settings);
      if ('reject' in wrapped) {
        setError(
          "Let's draw something else! What would you like Cloud to paint?",
        );
        return;
      }

      const deps = {
        apiKey: settings.huggingfaceToken,
        image: settings.image,
      };
      const provider = getImageProvider(deps);
      applyConfig(provider, deps);

      const controller = new AbortController();
      const active = { controller, messageId };
      activeRef.current = active;
      setError(null);
      setCancelledForMessageId(null);
      setGeneratingForMessageId(messageId);

      try {
        if (!(await provider.isAvailable())) {
          if (!controller.signal.aborted) {
            setError(
              'Add a Huggingface token in Settings → Image generation first.',
            );
          }
          return;
        }
        controller.signal.throwIfAborted();
        const blob = await provider.generate(wrapped.prompt, {
          signal: controller.signal,
        });
        controller.signal.throwIfAborted();
        await storeImageForMessage(
          rawPrompt,
          blob,
          messageId,
          controller.signal,
        );
        controller.signal.throwIfAborted();
        void awardSticker('first-image');
      } catch (err) {
        if (
          controller.signal.aborted ||
          (err instanceof Error && err.name === 'AbortError')
        )
          return;
        setError(friendlyErrorMessage(err));
      } finally {
        if (activeRef.current === active) {
          setGeneratingForMessageId(null);
          activeRef.current = null;
        }
      }
    },
    [settings],
  );

  useEffect(() => {
    return () => activeRef.current?.controller.abort();
  }, []);

  return {
    generatingForMessageId,
    cancelledForMessageId,
    error,
    generateForMessage,
    cancel,
    clearError,
  };
}
