import { describe, it, expect } from 'vitest';
import { inferEmotionFromReply, randomBoopEmotion } from './emotion';

describe('inferEmotionFromReply', () => {
  it('detects sad emoji', () => {
    expect(inferEmotionFromReply('Oh no 😢')).toBe('sad');
  });

  it('detects happy emoji', () => {
    expect(inferEmotionFromReply('That sounds fun! ✨')).toBe('happy');
  });

  it('detects surprise emoji', () => {
    expect(inferEmotionFromReply('Wow 😮')).toBe('surprise');
  });

  it('detects thinking emoji', () => {
    expect(inferEmotionFromReply('Hmm 🤔')).toBe('thinking');
  });

  it('detects blush emoji', () => {
    expect(inferEmotionFromReply('Aww 🙈')).toBe('blush');
  });

  it('falls back to keyword matching', () => {
    expect(inferEmotionFromReply('I am so sorry to hear that.')).toBe('sad');
    expect(inferEmotionFromReply('That is awesome!')).toBe('happy');
  });

  it('detects surprise from punctuation', () => {
    expect(inferEmotionFromReply('No way!!')).toBe('surprise');
  });

  it('defaults to happy for neutral text', () => {
    expect(inferEmotionFromReply('The sky is blue.')).toBe('happy');
  });
});

describe('randomBoopEmotion', () => {
  it('returns one of the playful emotions', () => {
    const pool = ['happy', 'surprise', 'blush'];
    expect(pool).toContain(randomBoopEmotion());
  });

  it('respects exclusions', () => {
    const result = randomBoopEmotion(['happy', 'surprise', 'blush']);
    // With all excluded, falls back to 'happy' via the ?? operator.
    expect(result).toBe('happy');
  });
});
