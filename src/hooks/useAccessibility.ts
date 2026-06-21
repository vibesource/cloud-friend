import { useEffect } from 'react';
import type { AccessibilityConfig } from '@/types/db';

/**
 * Applies accessibility CSS classes to <html> based on user settings.
 * - `a11y-dyslexia` swaps the font stack to a dyslexia-friendly fallback and
 *   adds gentle letter/word spacing.
 * - `a11y-large-touch` bumps base font size and increases button hit targets.
 */
export function useAccessibility(config: AccessibilityConfig | undefined) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('a11y-dyslexia', !!config?.dyslexiaFont);
    root.classList.toggle('a11y-large-touch', !!config?.largeTouch);
    return () => {
      root.classList.remove('a11y-dyslexia', 'a11y-large-touch');
    };
  }, [config?.dyslexiaFont, config?.largeTouch]);
}
