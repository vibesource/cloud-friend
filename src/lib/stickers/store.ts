import { db } from '@/lib/storage/db';
import { STICKERS, type StickerId } from './catalog';

export interface EarnedSticker {
  id: StickerId;
  earnedAt: number;
}

const STICKERS_META_KEY = 'stickers';

export async function getEarnedStickers(): Promise<EarnedSticker[]> {
  const row = await db.meta.get(STICKERS_META_KEY);
  if (!row || !Array.isArray(row.value)) return [];
  return row.value as EarnedSticker[];
}

export async function awardSticker(id: StickerId): Promise<boolean> {
  const earned = await getEarnedStickers();
  if (earned.some((s) => s.id === id)) return false;

  const known = STICKERS.some((s) => s.id === id);
  if (!known) return false;

  await db.meta.put({
    key: STICKERS_META_KEY,
    value: [...earned, { id, earnedAt: Date.now() }],
  });
  return true;
}

export async function clearStickers(): Promise<void> {
  await db.meta.delete(STICKERS_META_KEY);
}
