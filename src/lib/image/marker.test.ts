import { describe, it, expect } from 'vitest';
import { parseImageMarker, stripImageMarkerDraft } from './marker';

describe('parseImageMarker', () => {
  it('extracts a prompt and strips the marker', () => {
    const result = parseImageMarker('Here you go! {{IMG:cartoon rainbow cat}}');
    expect(result.prompt).toBe('cartoon rainbow cat');
    expect(result.content).toBe('Here you go!');
  });

  it('returns null prompt when no marker exists', () => {
    const result = parseImageMarker('Just a normal reply.');
    expect(result.prompt).toBeNull();
    expect(result.content).toBe('Just a normal reply.');
  });

  it('only keeps the first marker when multiple exist', () => {
    const result = parseImageMarker('A {{IMG:first}} and {{IMG:second}}');
    expect(result.prompt).toBe('first');
    expect(result.content).toBe('A  and');
  });

  it('trims and collapses whitespace in the prompt', () => {
    const result = parseImageMarker('{{IMG:   a    purple    cat   }}');
    expect(result.prompt).toBe('a purple cat');
  });

  it('caps absurdly long prompts', () => {
    const long = 'a'.repeat(500);
    const result = parseImageMarker(`{{IMG:${long}}}`);
    expect(result.prompt!.length).toBe(400);
  });
});

describe('stripImageMarkerDraft', () => {
  it('hides a partially-streamed marker', () => {
    expect(stripImageMarkerDraft('Look at this {{IMG:car')).toBe(
      'Look at this',
    );
  });

  it('passes through text without a marker', () => {
    expect(stripImageMarkerDraft('Hello world')).toBe('Hello world');
  });
});
