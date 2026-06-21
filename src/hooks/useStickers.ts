import { useLiveQuery } from 'dexie-react-hooks';
import { STICKERS } from '@/lib/stickers/catalog';
import { clearStickers, getEarnedStickers } from '@/lib/stickers/store';

export function useStickers() {
  const earned = useLiveQuery(() => getEarnedStickers(), [], []) ?? [];
  const earnedIds = new Set(earned.map((s) => s.id));
  return {
    earned,
    catalog: STICKERS,
    earnedIds,
    clear: clearStickers,
  };
}
