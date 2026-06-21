export interface ImageMarkerParseResult {
  /** Assistant content with all image markers removed. */
  content: string;
  /** First extracted image prompt, if present. */
  prompt: string | null;
}

const IMG_MARKER_RE = /\{\{IMG:([\s\S]*?)\}\}/gi;

/**
 * Extract the first structured image marker from assistant output and strip all
 * markers from displayed content. The marker is intentionally simple so the LLM
 * can reliably emit it:
 *
 *   {{IMG:cartoon rainbow cat on a cloud}}
 */
export function parseImageMarker(text: string): ImageMarkerParseResult {
  let firstPrompt: string | null = null;
  const content = text.replace(IMG_MARKER_RE, (_match, raw: string) => {
    if (firstPrompt === null) {
      const clean = raw.trim().replace(/\s+/g, ' ');
      if (clean.length > 0) firstPrompt = clean.slice(0, 400);
    }
    return '';
  });

  return {
    content: content.replace(/\n{3,}/g, '\n\n').trim(),
    prompt: firstPrompt,
  };
}

/**
 * Streaming helper: hide a marker as soon as the model starts emitting it,
 * even before the closing `}}` arrives. This prevents children seeing raw
 * tool syntax flash in the bubble during streaming.
 */
export function stripImageMarkerDraft(text: string): string {
  const markerStart = text.search(/\{\{IMG:/i);
  if (markerStart < 0) return text;
  return text
    .slice(0, markerStart)
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}
