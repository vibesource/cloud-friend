import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '@/lib/storage/db';
import { applyConfig, getImageProvider } from '@/lib/providers/image/registry';
import { wrapImagePrompt } from '@/lib/safety/image';
import { awardSticker } from '@/lib/stickers/store';
import { friendlyErrorMessage } from '@/lib/errors';
import { storeImage } from '@/hooks/useImageUrl';
import type { Settings } from '@/types/db';

interface UseImageGenResult {
  /** Message id currently generating an image, if any. */
  generatingForMessageId: string | null;
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
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!settings) return;
    const deps = {
      apiKey: settings.huggingfaceToken,
      image: settings.image,
    };
    applyConfig(getImageProvider(deps), deps);
  }, [settings]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setGeneratingForMessageId(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const generateForMessage = useCallback(
    async (messageId: string, rawPrompt: string) => {
      if (!settings) return;

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

      if (!(await provider.isAvailable())) {
        setError(
          'Add a Huggingface token in Settings → Image generation first.',
        );
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setError(null);
      setGeneratingForMessageId(messageId);

      try {
        const blob = await provider.generate(wrapped.prompt, {
          signal: controller.signal,
        });
        const imageId = await storeImage(rawPrompt, blob);
        void awardSticker('first-image');
        // Attach to the assistant message that triggered the request.
        await db.messages.update(messageId, { imageId });
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(friendlyErrorMessage(err));
      } finally {
        setGeneratingForMessageId(null);
        abortRef.current = null;
      }
    },
    [settings],
  );

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return {
    generatingForMessageId,
    error,
    generateForMessage,
    cancel,
    clearError,
  };
}
