import { useEffect, useMemo, useState } from 'react';
import type { Settings, SettingsInput } from '@/types/db';
import { useFacts } from '@/lib/storage/hooks';
import { deleteFact, clearAllFacts } from '@/lib/memory/store';
import { Checkbox, NumberField, TextArea, TextField } from './SettingsFields';
import styles from './SettingsPanel.module.css';

interface Props {
  settings: Settings;
  onSave: (input: SettingsInput) => Promise<void> | void;
  onClose: () => void;
}

export default function SettingsPanel({ settings, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<Settings>(settings);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const facts = useFacts();

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const dirty = useMemo(
    () => !shallowEqualSettings(draft, settings),
    [draft, settings],
  );

  function patch(p: Partial<Settings>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { id, updatedAt, ...input } = draft;
      void id;
      void updatedAt;
      await onSave(input);
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setDraft(settings);
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.panel}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Settings"
      >
        <header className={styles.header}>
          <h2>Settings</h2>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close settings"
          >
            ×
          </button>
        </header>

        <div className={styles.body}>
          <section className={styles.section}>
            <h3>Cloud&apos;s personality</h3>
            <TextArea
              label="Personality prompt"
              hint="Describes how Cloud behaves. A kid-safe base is always layered underneath."
              value={draft.personalityPrompt}
              onChange={(e) => patch({ personalityPrompt: e.target.value })}
              rows={5}
            />
          </section>

          <section className={styles.section}>
            <h3>AI chat (OpenAI-compatible)</h3>
            <TextField
              label="Base URL"
              hint="e.g. https://api.openai.com or https://router.huggingface.co"
              value={draft.llm.baseUrl}
              onChange={(e) =>
                patch({ llm: { ...draft.llm, baseUrl: e.target.value } })
              }
              placeholder="https://api.openai.com"
            />
            <TextField
              label="API key"
              type="password"
              hint="Stored only in this browser. Never sent anywhere except the URL above."
              value={draft.llm.apiKey}
              onChange={(e) =>
                patch({ llm: { ...draft.llm, apiKey: e.target.value } })
              }
              placeholder="sk-…"
              autoComplete="off"
            />
            <div className={styles.row2}>
              <TextField
                label="Main model"
                hint="Used for Cloud's replies."
                value={draft.llm.mainModel}
                onChange={(e) =>
                  patch({ llm: { ...draft.llm, mainModel: e.target.value } })
                }
                placeholder="gpt-4o-mini"
              />
              <TextField
                label="Utility model"
                hint="Used for memory extraction. Can be cheaper/faster."
                value={draft.llm.utilityModel}
                onChange={(e) =>
                  patch({
                    llm: { ...draft.llm, utilityModel: e.target.value },
                  })
                }
                placeholder="gpt-4o-mini"
              />
            </div>
          </section>

          <section className={styles.section}>
            <h3>Memory</h3>
            <div className={styles.row2}>
              <NumberField
                label="Context window (tokens)"
                hint="Recent messages Cloud keeps in mind."
                value={draft.memory.contextTokens}
                min={500}
                max={32000}
                step={100}
                onChange={(e) =>
                  patch({
                    memory: {
                      ...draft.memory,
                      contextTokens: Number(e.target.value),
                    },
                  })
                }
              />
              <NumberField
                label="Max facts injected"
                hint="How many memories Cloud weaves in per turn."
                value={draft.memory.maxFactsInjected}
                min={0}
                max={50}
                step={1}
                onChange={(e) =>
                  patch({
                    memory: {
                      ...draft.memory,
                      maxFactsInjected: Number(e.target.value),
                    },
                  })
                }
              />
            </div>
          </section>

          <section className={styles.section}>
            <h3>Huggingface (image generation)</h3>
            <TextField
              label="HF token"
              type="password"
              hint="Used only when generating images. Optional until that feature ships."
              value={draft.huggingfaceToken}
              onChange={(e) => patch({ huggingfaceToken: e.target.value })}
              placeholder="hf_…"
              autoComplete="off"
            />
            <div className={styles.row2}>
              <TextField
                label="Image model"
                value={draft.image.model}
                onChange={(e) =>
                  patch({ image: { ...draft.image, model: e.target.value } })
                }
              />
              <NumberField
                label="Width"
                value={draft.image.width}
                min={256}
                max={2048}
                step={64}
                onChange={(e) =>
                  patch({
                    image: { ...draft.image, width: Number(e.target.value) },
                  })
                }
              />
            </div>
          </section>

          <section className={styles.section}>
            <h3>Safety</h3>
            <Checkbox
              label="Keyword backstop filter"
              checked={draft.safety.keywordFilterEnabled}
              onChange={(e) =>
                patch({
                  safety: {
                    ...draft.safety,
                    keywordFilterEnabled: e.target.checked,
                  },
                })
              }
            />
            <TextArea
              label="Custom blocked words"
              hint="Comma-separated. Always merged with a built-in list."
              value={draft.safety.customBlocklist.join(', ')}
              onChange={(e) =>
                patch({
                  safety: {
                    ...draft.safety,
                    customBlocklist: e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter((s) => s.length > 0),
                  },
                })
              }
              rows={2}
            />
          </section>

          <section className={styles.section}>
            <h3>Cloud&apos;s memories ({facts.length})</h3>
            {facts.length === 0 ? (
              <p className={styles.empty}>
                No memories yet. They appear here as Cloud gets to know you.
              </p>
            ) : (
              <ul className={styles.factList}>
                {facts.map((f) => (
                  <li key={f.id} className={styles.factItem}>
                    <span>
                      <span className={styles.factKind}>{f.kind}</span>
                      {f.text}
                    </span>
                    <button
                      onClick={() => void deleteFact(f.id)}
                      aria-label="Forget this"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {facts.length > 0 && (
              <button
                className={styles.danger}
                onClick={() => void clearAllFacts()}
              >
                Forget everything
              </button>
            )}
          </section>
        </div>

        <footer className={styles.footer}>
          <div className={styles.saved}>
            {saving
              ? 'Saving…'
              : savedAt
                ? `Saved ${new Date(savedAt).toLocaleTimeString()}`
                : dirty
                  ? 'Unsaved changes'
                  : 'All changes saved'}
          </div>
          <div className={styles.actions}>
            <button
              className={styles.danger}
              onClick={handleReset}
              disabled={!dirty || saving}
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              style={{
                background: 'var(--cloud-accent)',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: 8,
                cursor: dirty && !saving ? 'pointer' : 'not-allowed',
                opacity: dirty && !saving ? 1 : 0.5,
                font: 'inherit',
                fontWeight: 600,
              }}
            >
              Save
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function shallowEqualSettings(a: Settings, b: Settings): boolean {
  return (
    JSON.stringify({ ...a, updatedAt: 0 }) ===
    JSON.stringify({ ...b, updatedAt: 0 })
  );
}
