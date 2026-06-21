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

## Phase 2 — emotion animations

Run after the Phase 1 checks, with valid LLM settings.

### Idle and ambient

- [ ] Cloud drifts gently side-to-side and bobs up/down when nothing is happening
- [ ] Verify in OS settings: enable "Reduce motion" / `prefers-reduced-motion`
      → all animations should stop completely

### During a turn

- [ ] On send, Cloud's face goes to **thinking** (small puff orbits her head)
- [ ] While tokens stream, Cloud's face bobs faster (**talking** chatter motion)
- [ ] When the reply finishes, Cloud's face settles on an inferred emotion
- [ ] Try "tell me a happy story" → Cloud ends with happy face + sparkles
- [ ] Try "say something exciting!" → Cloud ends with surprised face + "!" bang
- [ ] Try "what's 2+2? actually nvm" → Cloud's reply ends in thinking face
      if she says "hmm"; or happy by default
- [ ] If the reply trips the keyword filter, Cloud shows the **sad** face

### Tap to boop

- [ ] When idle, banner status reads "Cloud is here — tap to boop her!"
- [ ] Tap Cloud → she briefly shows a random cute emotion (happy/surprise/blush)
      with hearts or sparkles, then returns to her prior mood after ~1.4s
- [ ] Rapid taps extend the boop instead of cutting it short
- [ ] Tap Cloud while she's streaming → no-op (boop is suppressed mid-turn)
- [ ] Cursor becomes a pointer when hovering Cloud

## Phase 3 — voice

Run after the Phase 1/2 checks, with valid LLM settings.

### Tap-to-speak

- [ ] Cloud replies show a small speaker button in the top-right of the bubble
- [ ] Tap speaker → message is read aloud; Cloud avatar switches to talking
- [ ] Tap the stop icon (■) on the same message → speech stops and avatar returns
- [ ] Emoji / markdown markers are not read aloud (speech text is cleaned)
- [ ] Change Settings → Voice → Speech voice provider to Kokoro, save, then tap speaker
      → first use downloads the Kokoro model, later uses are cached by the browser
- [ ] With Kokoro selected, try `af_sky`, `af_heart`, and `af_bella` voices

### Mic input

- [ ] Tap microphone in the composer → browser asks for mic permission
- [ ] While listening, the mic pulses and banner says "Cloud is listening…"
- [ ] Speak a short sentence; interim transcript appears under the composer
- [ ] Stop speaking or tap the red mic → final transcript is sent to Cloud
- [ ] If the browser does not support Web Speech Recognition, an error appears
      explaining that Chrome/Edge are recommended

### Voice settings

- [ ] Settings → Voice shows provider selector, voice selector, rate/pitch, language
- [ ] Web Speech provider works without any model download
- [ ] Kokoro provider only loads after tapping a speaker while Kokoro is selected
- [ ] Changing speech recognition language persists after page refresh

## Phase 4 — image generation

Run after the Phase 1–3 checks, with a Huggingface token in Settings.

### Explicit draw button

- [ ] Settings → Huggingface has token, model, width/height fields
- [ ] Tap the 🎨 button in the composer → inline prompt appears
- [ ] Type a prompt and press Enter or tap 🎨 → assistant placeholder appears
- [ ] Cloud avatar switches to thinking while generation runs
- [ ] Placeholder says "Cloud is drawing…" with spinner
- [ ] Generated image appears inline in the assistant bubble
- [ ] Refresh the page → generated image persists (Dexie Blob storage)
- [ ] Unsafe/blocked prompt produces a friendly refusal error and no HF request
- [ ] Missing/invalid HF token shows a friendly Settings-oriented error

### Structured automation

- [ ] Type: "draw me a cute rainbow cat on a cloud"
- [ ] Cloud replies normally; raw `{{IMG:...}}` syntax never appears in the bubble
- [ ] The assistant bubble shows a drawing placeholder after Cloud's text
- [ ] Generated image attaches to the same assistant bubble
- [ ] Refresh the page → generated image persists
- [ ] Type an ordinary message like "how was your day?" → no image is generated
- [ ] If Cloud emits only a marker, UI falls back to "I'll draw that for you! ✨"

## Phase 5 — customizable Cloud

- [ ] Open Settings → Cloud's look
- [ ] Change Display name → Save → avatar title updates immediately
- [ ] Toggle Caticorn horn → Save → horn appears/disappears
- [ ] Change Ear color → Save → both ears update
- [ ] Change Cloud color → Save → cloud body updates but remains readable
- [ ] Change Backdrop color → Save → soft circle behind Cloud updates
- [ ] Refresh the page → all customizations persist

## Phase 5 — story mode

- [ ] Tap Story mode in the chat banner
- [ ] Enter a title and Start → Cloud posts a story opening
- [ ] Story badge appears with the active title
- [ ] Send a story continuation → Cloud replies with 2–4 story sentences and a prompt
- [ ] Ordinary chat while active stays in story-game style
- [ ] Tap End story → badge disappears and Cloud posts a wrap-up message
- [ ] Refresh while story mode is active → active title persists

## Phase 5 — stickers

- [ ] Send first chat message → Settings → Sticker album shows First Hello earned
- [ ] Generate first image → Tiny Artist earned
- [ ] Start first story → Story Spark earned
- [ ] Tap speaker on a Cloud reply → Cloud Speaks earned
- [ ] Refresh page → earned stickers persist
- [ ] Clear stickers → album returns to unearned state
