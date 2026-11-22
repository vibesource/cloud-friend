import { parseImageMarker, stripImageMarkerDraft } from '@/lib/image/marker';
import { effectiveBlocklist, isOutputSafe, REFUSAL } from './prompt';
import type { Settings } from '@/types/db';

export interface SafeStreamResult {
  content: string;
  imagePrompt: string | null;
  blocked: boolean;
}

/** Hold a possible blocklisted suffix until future chunks can disambiguate it. */
function safePrefix(text: string, blocklist: string[]): string {
  let held = 0;
  for (const word of blocklist) {
    for (
      let length = Math.min(word.length, text.length);
      length > held;
      length--
    ) {
      const suffix = text.slice(-length).toLowerCase();
      if (suffix.length < word.length && word.startsWith(suffix)) {
        held = length;
        break;
      }
    }
  }
  return held ? text.slice(0, -held) : text;
}

/** Never publish or persist a blocklisted word, even across chunk boundaries. */
export async function consumeSafeStream(
  stream: AsyncIterable<string>,
  settings: Settings,
  onPartial: (content: string) => Promise<void>,
): Promise<SafeStreamResult> {
  const blocklist = effectiveBlocklist(settings);
  const refusal = isOutputSafe(REFUSAL, settings)
    ? REFUSAL
    : isOutputSafe('…', settings)
      ? '…'
      : '';
  let accumulated = '';
  let published = '';

  for await (const chunk of stream) {
    accumulated += chunk;
    if (!isOutputSafe(accumulated, settings)) {
      return { content: refusal, imagePrompt: null, blocked: true };
    }
    const visible = stripImageMarkerDraft(safePrefix(accumulated, blocklist));
    if (visible !== published) {
      await onPartial(visible);
      published = visible;
    }
  }

  const parsed = parseImageMarker(accumulated);
  const content =
    parsed.content ||
    (parsed.prompt ? "I'll draw that for you! ✨" : accumulated);
  // Removing a marker could join text into a blocked word.
  if (!isOutputSafe(content, settings)) {
    return { content: refusal, imagePrompt: null, blocked: true };
  }
  return { content, imagePrompt: parsed.prompt, blocked: false };
}
