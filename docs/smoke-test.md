# Cloud AI — smoke checklist

Run this before committing each phase. Everything should pass.

## Automated (run from repo root)

```bash
npm run lint         # eslint, no errors
npm run typecheck    # tsc --noEmit, no errors
npm run format:check # prettier, no changes needed
npm run build        # tsc -b && vite build, succeeds
npm run dev          # boots within ~2s, no errors in terminal
```

Recommended order: `lint → typecheck → build`.

## Manual (open the app at http://localhost:5173)

### First-run (no settings yet)

- [ ] App loads, gradient background visible, Cloud avatar at top of chat view
- [ ] Banner says "Almost ready…" with a yellow warning to open Settings
- [ ] Composer is disabled
- [ ] Click gear icon (top right) → Settings panel slides in from the right

### Settings panel

- [ ] Personality prompt is pre-filled with the default Cloud personality
- [ ] Typing in any field flips footer to "Unsaved changes", Save button enables
- [ ] Save → footer shows "Saved HH:MM:SS" with the current time
- [ ] Refresh page → saved values persist (Dexie working)
- [ ] Reset reverts to last-saved state
- [ ] X button closes panel; clicking outside the panel also closes it
- [ ] "Cloud's memories" section shows the empty-state message

### With valid LLM settings

Fill in: base URL (e.g. `https://api.openai.com`), API key, main model
(e.g. `gpt-4o-mini`), utility model (same is fine).

- [ ] Close settings → banner now says "Cloud is here", composer enabled
- [ ] Type "hi" + Enter → user bubble appears on right
- [ ] Cloud bubble appears on left with "…" then fills in token-by-token
- [ ] Cloud avatar emotion goes: thinking → talking → happy (or sad if filtered)
- [ ] Streaming cursor (▋) blinks while tokens arrive
- [ ] Stop button (■) replaces Send while streaming; clicking it halts cleanly
- [ ] Enter sends; Shift+Enter inserts newline
- [ ] Send empty message: button is disabled, nothing happens
- [ ] Markdown renders: try asking Cloud to reply with `**bold**` or a list

### Memory (best-effort, needs utility model)

- [ ] Refresh the page → conversation history is still there
- [ ] Send a few messages that share a fact ("my favorite color is purple")
- [ ] Open Settings → "Cloud's memories" shows the extracted fact
- [ ] Click the × next to a fact → it disappears
- [ ] "Forget everything" clears all facts

### Safety backstop

- [ ] With keyword filter on, type a clearly-blocked word → friendly refusal
      bubble appears (no API call made)
- [ ] Turn filter off in settings, save, retry → request goes through

## After passing

- `git status` to confirm only intended files changed
- Commit with a `Phase N:` prefix per `AGENTS.md`
