# Cloud AI — Implementation Plan

This is the working plan for building Cloud, a browser-only AI friend for a 9-year-old
("caticorn" online). It is broken into phases sized for short feedback loops. Each phase
ends with a working milestone the child can actually play with, then a git commit.

The authoritative product spec is `../REQUIREMENTS.md`. This doc covers _how_ we build it.

---

## Product framing

Cloud is a **cat riding a floating cloud** — a character invented by the child herself,
tying into her "caticorn" identity. The emotional payoff is _friendship with a creature
that remembers her_. Everything technical serves that one feeling.

### Character: Cloud the caticorn-cloud-cat

A small cat (cat ears, whiskers, maybe a tiny unicorn horn for the caticorn tie-in)
sitting on / merged with a fluffy cumulus cloud. Emotions are expressed by **both** the
cat face and the cloud at the same time:

| Emotion  | Cat face               | Cloud behavior                             |
| -------- | ---------------------- | ------------------------------------------ |
| happy    | smile, eyes arc up     | tiny sparkles / sun rays around the cloud  |
| sad      | frown, teardrop        | soft raindrops fall from cloud             |
| surprise | wide eyes, mouth "o"   | cloud puffs up suddenly, small "!" appears |
| blush    | pink cheeks            | tiny hearts float up from cloud            |
| idle     | slow blink, gentle bob | cloud drifts side to side slowly           |
| thinking | eyes up, paw on chin   | tiny cloud-puffs orbit around her          |
| talking  | mouth animates         | cloud bobs in rhythm                       |

Feasibility: completely doable with one inline SVG per emotion, swapped via React state,
with CSS keyframe animations layered on top for ambient motion (drift, bob, sparkle).
This is cheaper than sprite sheets, scales crisply on retina displays, and is trivial to
tweak ("make her ears pinker") without re-exporting art. We keep the door open to swap
in richer art (Rive, Lottie) later without changing the component contract.

### The kid-facing loop

She types (or speaks) → Cloud reacts emotionally → replies in character → optionally
generates an image → optionally speaks the reply out loud → remembers what mattered.

### Personality hooks

Cloud should feel like a peer, not a teacher. Default system-prompt traits:

- curious, encouraging, mildly goofy, never sarcastic
- asks follow-up questions; remembers details she shared
- turns things into small games ("wanna make up a story together?")
- never condescending; never reveals she's an AI unless directly asked
- mirrors her interests (art, animals, stories, music) back to her

The personality prompt lives in Settings and is parent-editable.

---

## Architecture

### Stack (locked)

- **Vite + React + TypeScript** — single-page app, no SSR
- **Dexie (IndexedDB)** — all persistent state. localStorage reserved for trivial flags.
- **`@huggingface/inference`** — image generation (browser-side `InferenceClient`)
- **OpenAI-compatible fetch** — main + utility LLM calls, using user-supplied base URL
- **Web Speech API** — built-in TTS/STT default; pluggable providers for hosted options

### Directory layout

```
src/
  app/                 # App shell, routing (single view for now), providers
  components/
    cloud-avatar/      # SVG cat-cloud, emotion state machine, ambient animation
    chat/              # message list, composer, streaming bubbles
    settings/          # settings panel + per-provider subforms
    image-gen/         # in-chat image generation affordance + gallery
    story-game/        # turn-taking story UI
  lib/
    llm/               # OpenAI-compatible client, streaming, role routing
    memory/            # Dexie tables, fact extraction, context-window injection
    providers/         # provider abstraction for TTS / STT / image-gen
    speech/            # Web Speech wrappers
    storage/           # Dexie schema, migrations, typed hooks
    safety/            # system-prompt assembly + keyword guardrails
  hooks/               # react hooks (useChat, useMemory, useCloud, useSpeech)
  types/               # shared TS types
  styles/              # theme, cloud-palette, animations
docs/                  # design docs (this file, decisions, ADRs)
```

### Data model (Dexie tables)

- `messages` — `{ id, role, content, emotion?, imageId?, ts }`
- `facts` — `{ id, kind: 'preference'|'event'|'person'|'interest', text, confidence, ts, lastUsed }`
- `images` — `{ id, prompt, blob, ts }`
- `settings` — singleton row holding all provider config + personality + context-window size
- `stickers` — `{ id, earnedAt }` (phase 5 engagement)
- `meta` — singletons: streak, lastVisit, customizations

### Provider abstraction

Single interface, multiple implementations behind it:

```ts
interface TTSProvider {
  speak(text: string, opts?): void;
  cancel(): void;
}
interface STTProvider {
  start(): Promise<string>;
  stop(): void;
}
interface ImageProvider {
  generate(prompt: string): Promise<Blob>;
}
interface LLMProvider {
  stream(messages, opts): AsyncIterable<string>;
}
```

Settings selects one implementation per interface. This is what lets us ship Phase 1 with
nothing wired and add Web Speech in Phase 2 and HF image gen in Phase 3 without touching
the chat loop.

### Memory system

- A "context window" (token budget, parent-configurable) holds the recent message tail.
- When messages scroll out of that window, the **utility model** is prompted to extract
  durable facts ("her cat is named Mochi", "she's nervous about Friday's test").
- Facts live in `facts` table with kind + confidence. Low-confidence facts decay.
- On each turn, top-N facts by relevance/recency are injected into a `system` block,
  above the recent message tail.
- The parent can view/edit/delete facts from Settings — kid trust depends on transparency.

### Safety scaffolding

- Hardcoded **kid-safe base system prompt** layered under the user-editable personality.
  The base prompt is non-negotiable: warm tone, age-appropriate, refuses scary/adult
  topics, never reveals frightening content, gently redirects.
- Light keyword filter on user input and model output as a backstop (configurable off).
- All safety decisions documented in `docs/safety.md` for parent review.

---

## Phases

Each phase is independently committable. Phases are sized so a motivated session can
finish one in a sitting.

### Phase 0 — Scaffold & repo hygiene ✅ _(small)_

- `git init`, `.gitignore` (node_modules, dist, .env, .dexie)
- `npm create vite@latest . -- --template react-ts`
- Install: `dexie`, `@huggingface/inference`, `idb-keyval` (optional), `react-markdown`
- ESLint + Prettier + `tsc --noEmit` in `lint` and `typecheck` scripts
- Commit baseline.

**Exit:** `npm run dev` shows a hello-world page; `npm run build` passes; `npm run lint`
and `npm run typecheck` are clean.

### Phase 1 — Chat + memory + settings ✅ _(core)_

This is the milestone you asked for. No media yet.

- Dexie schema + typed `useDB` hooks (`messages`, `facts`, `settings`, `meta`).
- Settings panel: base URL, API key, main model, utility model, context-window size,
  personality prompt. Settings persist in Dexie.
- `lib/llm`: OpenAI-compatible streaming chat. Two roles wired from settings.
- `lib/memory`: on message eviction, call utility model to extract facts; on each turn,
  inject top facts into system block.
- `lib/safety`: assemble system prompt = `kidSafeBase + personality + facts`.
- Static Cloud avatar SVG with emotion prop (idle only at first).
- Chat UI: streaming bubbles, composer, persistent history. Markdown rendering for
  Cloud's replies. Auto-scroll on new content.
- Strong kid-safe system prompt, tested with a few conversation scenarios.

**Exit:** Child can hold a real conversation with Cloud, who remembers things across
page reloads. Settings page works.

### Phase 2 — Emotion animations ✅ _(delight spike)_

- Full SVG cat-cloud character with the emotion table above.
- `useCloud` hook infers emotion from the latest assistant message (via a tiny
  side-call to the utility model, or simple keyword rules — start with rules, upgrade
  to LLM-tagged if cheap).
- CSS keyframes for ambient motion (drift, bob, blink) and per-emotion flairs
  (raindrops, sparkles, hearts).
- Tap Cloud → she does a random cute reaction. Idle animations when chat is quiet.

**Exit:** Cloud visibly reacts to the conversation. The child smiles. This is the
moment the product becomes a _friend_.

### Phase 3 — Voice (TTS + STT) ✅ _(sensory)_

- Implement provider abstraction for TTS and STT.
- Default: Web Speech API (built-in, zero setup).
- Add hosted TTS option in settings (HF `speech`/`transformers.js` later if needed).
- Add hosted STT option (Whisper via HF or transformers.js).
- Mic button and speaker-toggle in the composer; Cloud's mouth animates while speaking.
- Permission flow for mic; graceful fallback when not granted.

**Exit:** Child can talk to Cloud and hear her talk back.

### Phase 4 — Image generation ✅ _(magic moment)_

- `ImageProvider` abstraction. Default impl: HF `InferenceClient.textToImage()`.
- Composer affordance: "draw me a…" or button → prompt confirm → image appears inline.
- Image gallery in chat history; images stored as Blobs in Dexie.
- Settings: image model dropdown, width/height, NSFW filter on.
- Loading state: Cloud does her "thinking" animation while generating.

**Exit:** Child can ask Cloud to draw her ideas.

### Phase 5 — Engagement & customization ✅ _(retention)_

- **Story-game mode**: turn-taking; Cloud opens with a premise; each reply advances
  the story. Persisted as a `story` session in Dexie, resumable.
- **Customizable Cloud**: pick ear color, horn on/off, cloud pattern, name (default
  "Cloud"). Stored in `meta`. Reflected in avatar immediately.
- **Named-facts recall showcase**: occasionally Cloud proactively references a known
  fact ("how did Mochi's vet visit go?") — utility-driven.
- **Sticker / badge collection**: small wins (5 chats, first image, finished story)
  unlock virtual stickers shown in a little album. Non-intrusive.

**Exit:** Cloud feels like _hers_ — personalized, remembers her life, plays with her.

### Phase 6 — Polish & hardening ✅

- Theme work: kid-friendly palette, large touch targets, dyslexia-friendly font option.
- Empty states, error states (API key wrong, network down, model unavailable).
- Export chat / clear chat / per-fact delete in settings.
- Light privacy doc for parents: what's stored, where (browser only), how to wipe.
- README updated with screenshots + parent setup walkthrough.

---

## Testing approach

- **Unit tests** (Vitest) for pure logic: memory fact extraction, context-window
  eviction, system-prompt assembly, emotion inference rules.
- **Component tests** (Vitest + Testing Library) for chat and settings UI.
- **No live API calls in tests** — provider interfaces make mocking trivial.
- **Manual smoke checklist** in `docs/smoke-test.md`, run before each phase commit.

---

## Risks & open questions

- **Browser TTS quality on Linux Chromium is uneven.** Mitigation: Phase 3 makes hosted
  TTS pluggable from day one; document which browser/OS combos give best built-in voice.
- **HF image generation cost & rate limits.** Mitigation: surface cost/usage in settings;
  cache generated images; add parent-side "N images per session" cap if needed.
- **Utility-model latency on memory extraction.** Mitigation: run extraction in the
  background after eviction, not blocking the chat turn.
- **Kid-safety is only as good as the underlying model's RLHF.** Mitigation: strong base
  prompt + keyword filter + parent-editable. Document the limits honestly in settings.

---

## When this plan should change

Phases will slip, merge, or split. Update this file when:

- a phase is shipped (mark it ✅ and note any deviations)
- a decision in `AGENTS.md` supersedes something here
- a new risk is discovered that changes phase order

Prefer recording _why_ a phase order changed, not just _that_ it did.
