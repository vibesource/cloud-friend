import type { StoryState } from './state';

export function buildStoryPrompt(story: StoryState): string {
  if (!story.active) return '';
  return [
    'STORY GAME MODE IS ACTIVE.',
    `Story title: ${story.title || 'Cloud Story'}.`,
    'You and the child are making up a story together, taking turns.',
    'Rules:',
    '- Keep your story contribution short: 2–4 sentences.',
    '- End with a gentle choice or question that invites the child to add the next part.',
    '- Preserve what the child adds; do not overwrite their ideas.',
    '- Keep the story cozy, funny, magical, and kid-safe.',
    '- Avoid scary villains, danger, death, weapons, or adult themes.',
    '- If the child asks to stop story mode, wrap up warmly and suggest ending the story.',
  ].join('\n');
}

export function openingStoryMessage(title: string): string {
  const safeTitle = title.trim() || 'Cloud Story';
  return [
    `Let's make a story called **${safeTitle}**! ✨`,
    '',
    'I will start with a tiny opening, then you add what happens next.',
    '',
    `Once upon a time, ${safeTitle.toLowerCase()} began on a fluffy cloud shaped like a cat paw. Cloud peeked over the edge and spotted something sparkling below…`,
    '',
    'What did Cloud see?',
  ].join('\n');
}
