import { useEffect, useState } from 'react';
import { db } from '@/lib/storage/db';

const urlCache = new Map<string, string>();

/**
 * Resolve a stored image id to an object URL. Object URLs are cached for the
 * lifetime of the cache so repeated renders of the same image are cheap.
 * Returns null while loading or if the image is missing.
 */
export function useImageUrl(imageId: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() =>
    imageId ? (urlCache.get(imageId) ?? null) : null,
  );

  useEffect(() => {
    if (!imageId) {
      setUrl(null);
      return;
    }
    const cached = urlCache.get(imageId);
    if (cached) {
      setUrl(cached);
      return;
    }
    let cancelled = false;
    void db.images.get(imageId).then((stored) => {
      if (cancelled || !stored) {
        setUrl(null);
        return;
      }
      const objectUrl = URL.createObjectURL(stored.blob);
      urlCache.set(imageId, objectUrl);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [imageId]);

  return url;
}

/** Atomically save and attach an image, unless the drawing was cancelled. */
export async function storeImageForMessage(
  prompt: string,
  blob: Blob,
  messageId: string,
  signal: AbortSignal,
): Promise<void> {
  const id = makeId();
  await db.transaction('rw', db.images, db.messages, async () => {
    signal.throwIfAborted();
    const message = await db.messages.get(messageId);
    if (!message)
      throw new DOMException('Message no longer exists', 'AbortError');
    signal.throwIfAborted();
    await db.images.put({ id, prompt, blob, ts: Date.now() });
    signal.throwIfAborted();
    await db.messages.update(messageId, { imageId: id });
    signal.throwIfAborted();
  });
  // Pre-seed the cache so useImageUrl resolves synchronously on first render.
  urlCache.set(id, URL.createObjectURL(blob));
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
