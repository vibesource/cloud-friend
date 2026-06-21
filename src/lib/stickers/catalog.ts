export type StickerId =
  | 'first-chat'
  | 'first-image'
  | 'first-story'
  | 'first-voice';

export interface StickerDefinition {
  id: StickerId;
  label: string;
  emoji: string;
  description: string;
}

export const STICKERS: StickerDefinition[] = [
  {
    id: 'first-chat',
    label: 'First Hello',
    emoji: '💬',
    description: 'Sent your first message to Cloud.',
  },
  {
    id: 'first-image',
    label: 'Tiny Artist',
    emoji: '🎨',
    description: 'Asked Cloud to draw a picture.',
  },
  {
    id: 'first-story',
    label: 'Story Spark',
    emoji: '📖',
    description: 'Started a story with Cloud.',
  },
  {
    id: 'first-voice',
    label: 'Cloud Speaks',
    emoji: '🔊',
    description: 'Heard Cloud read a message aloud.',
  },
];

export function getSticker(id: StickerId): StickerDefinition {
  return STICKERS.find((s) => s.id === id) ?? STICKERS[0];
}
