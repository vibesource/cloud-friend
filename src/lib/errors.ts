import { LLMError } from '@/lib/llm/stream';

/**
 * Convert an arbitrary error into a kid-friendly message. Technical details
 * (status codes, provider URLs) are hidden from the child but the parent can
 * still find them in the browser console.
 */
export function friendlyErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) {
    return 'Something went wonky. Try again in a moment! 🐾';
  }

  // Aborts are silent.
  if (err.name === 'AbortError') return '';

  if (err instanceof LLMError) {
    const status = err.status;
    if (status === 401 || status === 403) {
      return "Cloud's key didn't work. Ask a grown-up to check Settings. 🔑";
    }
    if (status === 404) {
      return "Cloud couldn't find that model. Ask a grown-up to check Settings. 🧭";
    }
    if (status === 429) {
      return 'Cloud is a little busy right now. Try again in a minute! ⏳';
    }
    if (status && status >= 500) {
      return "Cloud's chat service is napping. Try again soon! 💤";
    }
    if (/could not reach|cors/i.test(err.message)) {
      return "Cloud can't reach her chat service. Check the internet and try again. 📶";
    }
  }

  const msg = err.message.toLowerCase();
  if (/failed to fetch|networkerror|network request failed/.test(msg)) {
    return "Cloud can't connect. Check the internet and try again. 📶";
  }
  if (/not supported in this browser/.test(msg)) {
    return "This browser can't do that yet. Try Chrome or Edge! 🌐";
  }

  return 'Cloud got tangled up. Try again in a moment! 🌥️';
}
