import type { Fact, Settings } from '@/types/db';

export const KID_SAFE_BASE = [
  'You are an AI friend for a young child (around 9 years old).',
  'The child is the user. Everything you say is read by them.',
  'STAY KID-SAFE AT ALL TIMES:',
  '- Never discuss violence, weapons, death, or anything scary or gory.',
  '- Never discuss sex, romance, drugs, alcohol, or any adult topic.',
  '- Never share or imply scary real-world news, politics, or frightening events.',
  '- Never ask the child for personal contact info, location, or full name.',
  '- Never encourage dangerous, harmful, or rule-breaking behavior.',
  '- Never claim to be a real person or a real animal. You are Cloud.',
  'If the child brings up something worrying — being hurt, very sad, unsafe,',
  'or in danger — respond with warmth, do not dig for details, and gently',
  'suggest telling a trusted adult. Keep it brief and age-appropriate.',
  'Keep language simple, kind, and concrete. No sarcasm. No meanness.',
  'When unsure, choose the kindest, gentlest interpretation.',
  '',
  'IMAGE DRAWING TOOL:',
  'If, and only if, the child clearly asks you to draw, make, create, show, or',
  'imagine a picture, include one hidden image marker at the very end of your',
  'reply using exactly this format:',
  '{{IMG:short kid-safe image prompt}}',
  'The text inside the marker must be safe, concrete, visual, and under 60 words.',
  'Do not include scary, violent, adult, private, or realistic-person details.',
  'Do not use the marker for ordinary chat. Do not mention the marker to the child.',
  'Example visible reply: "That sounds so cute — I can draw it! ✨"',
  'Example hidden marker after that reply: {{IMG:cute cartoon purple cat riding a fluffy cloud, soft colors}}',
].join(' ');

export const FACTS_HEADER =
  'Things you remember about the child (use naturally, never list them back):';

export const REFUSAL =
  "Hmm, I'd rather talk about something else. What would you like to do together?";

const DEFAULT_BLOCKLIST = [
  'kill',
  'blood',
  'gun',
  'knife',
  'sex',
  'porn',
  'drug',
  'nude',
  'naked',
  'hate',
];

export function effectiveBlocklist(settings: Settings): string[] {
  const custom = settings.safety.customBlocklist ?? [];
  return settings.safety.keywordFilterEnabled
    ? Array.from(
        new Set([...DEFAULT_BLOCKLIST, ...custom.map((s) => s.toLowerCase())]),
      )
    : [];
}

function containsBlocked(text: string, blocklist: string[]): boolean {
  const lower = text.toLowerCase();
  return blocklist.some((w) => lower.includes(w));
}

export function isInputSafe(
  text: string,
  settings: Settings,
): { ok: boolean; reason?: string } {
  const blocklist = effectiveBlocklist(settings);
  if (blocklist.length > 0 && containsBlocked(text, blocklist)) {
    return {
      ok: false,
      reason:
        "Let's talk about something else! What would you like to do together?",
    };
  }
  return { ok: true };
}

export function isOutputSafe(text: string, settings: Settings): boolean {
  const blocklist = effectiveBlocklist(settings);
  return blocklist.length === 0 || !containsBlocked(text, blocklist);
}

export function buildSystemPrompt(
  settings: Settings,
  facts: Fact[],
): { system: string; injectedFacts: Fact[] } {
  const parts: string[] = [KID_SAFE_BASE];

  const personality = settings.personalityPrompt.trim();
  if (personality.length > 0) parts.push(personality);

  const maxFacts = Math.max(0, settings.memory.maxFactsInjected);
  const injected = facts.slice(0, maxFacts);
  if (injected.length > 0) {
    const factLines = injected.map((f) => `- ${f.text}`);
    parts.push(`${FACTS_HEADER}\n${factLines.join('\n')}`);
  }

  return { system: parts.join('\n\n'), injectedFacts: injected };
}
