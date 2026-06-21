import { db } from '@/lib/storage/db';
import type { Message } from '@/types/db';

export async function exportChatAsJson(): Promise<string> {
  const messages = await db.messages.orderBy('ts').toArray();
  const facts = await db.facts.toArray();
  const cleaned: Array<
    Pick<Message, 'role' | 'content' | 'ts' | 'emotion' | 'imageId'>
  > = messages.map((m) => ({
    role: m.role,
    content: m.content,
    ts: m.ts,
    emotion: m.emotion,
    imageId: m.imageId,
  }));
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      messageCount: cleaned.length,
      messages: cleaned,
      facts: facts.map((f) => ({ kind: f.kind, text: f.text })),
    },
    null,
    2,
  );
}

export async function clearChat(): Promise<void> {
  await db.messages.clear();
}

export async function clearAllData(): Promise<void> {
  await db.messages.clear();
  await db.facts.clear();
  await db.images.clear();
  await db.meta.clear();
}
