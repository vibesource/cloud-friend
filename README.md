# Cloud AI

A browser-only AI friend for kids. Cloud is a cat riding a floating cloud — she
remembers what your child tells her, reacts with cute animations, can talk and
listen, and can draw pictures on request.

**Status:** Phase 3 complete — chat, memory, settings, emotions, tap-to-speak,
and mic input work end-to-end. Image generation and engagement extras land in
later phases. See `docs/plan.md` for the full roadmap.

## Quick start

```bash
npm install      # install dependencies
npm run dev      # start the dev server at http://localhost:5173
```

## Common commands

| Command                | Purpose                                            |
| ---------------------- | -------------------------------------------------- |
| `npm run dev`          | Vite dev server with HMR                           |
| `npm run build`        | Type-check then build production bundle to `dist/` |
| `npm run preview`      | Preview the production build locally               |
| `npm run typecheck`    | `tsc --noEmit` across the project                  |
| `npm run lint`         | ESLint flat-config check                           |
| `npm run lint:fix`     | ESLint with `--fix`                                |
| `npm run format`       | Prettier write                                     |
| `npm run format:check` | Prettier check (CI-friendly)                       |

Recommended order before committing: `lint` → `typecheck` → `build`.

## Project layout

```
src/
  app/          # app shell, providers (future)
  components/   # react components (avatar, chat, settings, ...)
  lib/          # llm, memory, providers, storage, safety
  hooks/        # react hooks
  types/        # shared TS types
  styles/       # theme + animations
docs/           # design docs and the implementation plan
public/         # static assets served as-is
```

See `docs/plan.md` for the phase breakdown and architectural decisions, and
`REQUIREMENTS.md` for the authoritative product spec.

## Notes for parents

- Everything runs in the browser. No backend, no server-side storage.
- API keys (for the LLM endpoint and Huggingface) are entered in Settings and
  stored locally in the browser's IndexedDB. They never leave the device except
  to call the providers you configure.
- Chat history, memory facts, and generated images can be reviewed and deleted
  from Settings at any time.
- A kid-safe system prompt is always layered under the editable personality,
  plus an optional keyword backstop filter (on by default). Both are documented
  in `src/lib/safety/prompt.ts`.
- Voice has two TTS providers: Web Speech API (instant, OS/browser voices) and
  Kokoro (`kokoro-js`, browser-local model). Kokoro is opt-in in Settings and
  downloads its model/WASM chunk only on first use.

## First-run setup

1. `npm install && npm run dev`
2. Open http://localhost:5173
3. Click the gear icon (top right) and fill in:
   - Base URL (e.g. `https://api.openai.com`)
   - API key
   - Main model (e.g. `gpt-4o-mini`)
   - Utility model — can be the same; used for memory extraction
4. Close Settings and say hi to Cloud.
