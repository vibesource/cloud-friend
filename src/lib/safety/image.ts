import type { Settings } from '@/types/db';
import { effectiveBlocklist } from './prompt';

/** Tags prepended to every image prompt to bias toward kid-friendly output. */
const KID_STYLE_TAGS = [
  'cute cartoon illustration',
  'friendly',
  'soft colors',
  'wholesome',
  'child-friendly',
  'no text',
  'no watermark',
].join(', ');

/**
 * Wrap a raw prompt for kid-safe image generation. Returns null if the prompt
 * is empty or trips the safety blocklist — callers should refuse silently
 * rather than tell the child *why* (no need to repeat the blocked word back).
 */
export function wrapImagePrompt(
  raw: string,
  settings: Settings,
): { prompt: string } | { reject: true } {
  const clean = raw.trim().slice(0, 400);
  if (clean.length === 0) return { reject: true };

  const blocklist = effectiveBlocklist(settings);
  if (blocklist.length > 0) {
    const lower = clean.toLowerCase();
    for (const word of blocklist) {
      if (lower.includes(word)) return { reject: true };
    }
  }

  return { prompt: `${KID_STYLE_TAGS} — ${clean}` };
}
