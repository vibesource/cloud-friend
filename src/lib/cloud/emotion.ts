import type { Emotion } from '@/types/db';

/**
 * Rule-based emotion inference from Cloud's reply text. Fast, free, and good
 * enough for most cases. Returns the *target* emotion to display once the
 * reply finishes streaming.
 *
 * Order matters: more specific signals first. Emoji are the strongest signal
 * (Cloud is encouraged to use them by the personality prompt), then keywords.
 */
export function inferEmotionFromReply(text: string): Emotion {
  const lower = text.toLowerCase();

  // Emoji are the strongest signal. Each emoji tested in its own regex to
  // avoid combining-character pitfalls.
  if (hasAny(text, ['😢', '😭', '💧', '😿', '☹', '🙁'])) return 'sad';
  if (
    hasAny(text, [
      '😄',
      '😃',
      '😀',
      '😺',
      '😻',
      '😍',
      '🥰',
      '🌸',
      '✨',
      '🎉',
      '💫',
      '☀',
    ])
  ) {
    return 'happy';
  }
  if (hasAny(text, ['😳', '🥹', '🙈', '💗', '💙', '💚', '🩷'])) return 'blush';
  if (hasAny(text, ['😮', '😯', '😱', '🙀', '❗', '❓'])) return 'surprise';
  if (hasAny(text, ['🤔', '💡'])) return 'thinking';

  // Word-based signals, ordered by specificity.
  if (/\b(sorry|sad|aww|oh no|miss|worried|scared|afraid|hurt)\b/.test(lower)) {
    return 'sad';
  }
  if (
    /\b(wow|whoa|no way|really)\b/.test(lower) ||
    /\?{1,}!{1,}|!{1,}\?{1,}/.test(text)
  ) {
    return 'surprise';
  }
  if (
    /\b(cute|sweet|lovely|love|adore|yay|hooray|awesome|happy)\b/.test(lower)
  ) {
    return 'happy';
  }
  if (/\b(heh|tehe|blush|aw shucks)\b/.test(lower)) {
    return 'blush';
  }
  if (/\b(hmm|let me think|maybe|perhaps|i wonder|not sure)\b/.test(lower)) {
    return 'thinking';
  }

  // Punctuation signals.
  if (/[!?]{2,}/.test(text)) return 'surprise';

  // Default: warm baseline.
  return 'happy';
}

function hasAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

/**
 * Quick pick of a "cute" emotion for tap-to-boop. Excludes sad/thinking
 * so taps stay playful.
 */
export function randomBoopEmotion(exclude: Emotion[] = []): Emotion {
  const pool: Emotion[] = ['happy', 'surprise', 'blush'];
  const choices = pool.filter((e) => !exclude.includes(e));
  const pick = choices[Math.floor(Math.random() * choices.length)] ?? 'happy';
  return pick;
}
