import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ensureSettingsSeeded, readSettings, updateSettings } from './db';
import type { Fact, Message, Settings, SettingsInput } from '@/types/db';

export function useMessages(): Message[] {
  const fallback: Message[] = [];
  return (
    useLiveQuery(() => db.messages.orderBy('ts').toArray(), [], fallback) ??
    fallback
  );
}

export function useFacts(): Fact[] {
  const fallback: Fact[] = [];
  return (
    useLiveQuery(
      () => db.facts.orderBy('lastUsed').reverse().toArray(),
      [],
      fallback,
    ) ?? fallback
  );
}

export function useSettings(): Settings | undefined {
  const settings = useLiveQuery(() => readSettings(), []);
  useEffect(() => {
    if (settings === undefined) {
      void ensureSettingsSeeded();
    }
  }, [settings]);
  return settings;
}

export async function saveSettings(input: SettingsInput): Promise<void> {
  await updateSettings(input);
}
