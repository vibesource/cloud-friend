# AGENTS.md

Notes for OpenCode sessions working in this repo.

## Source of truth

- `REQUIREMENTS.md` is the product spec and the authoritative description of intent.
  Read it first before any implementation work.
- `docs/plan.md` is the implementation plan (phases, architecture, data model).
  Update it as phases ship; mark shipped phases ✅.
- This is a **browser-only** app. No backend, no server-side secrets. Anything
  requiring a key (Huggingface, OpenAI-compatible endpoints) runs client-side and
  is entered by the user in Settings; never ship keys in code or commit them.

## Developer commands

Recommended pre-commit order: `lint` → `typecheck` → `build`.

```bash
npm install                 # install deps
npm run dev                 # vite dev server at http://localhost:5173
npm run lint                # eslint (flat config)
npm run lint:fix            # eslint --fix
npm run format              # prettier --write
npm run format:check        # prettier check (no writes)
npm run typecheck           # tsc --noEmit
npm run build               # tsc -b && vite build
npm run preview             # preview the built bundle
```

`tsc -b` in `build` uses project references; `typecheck` uses `--noEmit`. Run
`typecheck` during development, `build` for full verification.

## Stack & conventions

- **Vite + React 18 + TypeScript** (strict). Path alias `@/*` → `src/*`
  (configured in both `tsconfig.json` and `vite.config.ts` — keep in sync).
- **Module system:** ESM, `"type": "module"`. Use `import`/`export` only.
- **Persistence:** IndexedDB via `dexie` + `dexie-react-hooks`. Do not use
  `localStorage` for chat history, memory facts, or preferences — those belong
  in Dexie tables. Reserve `localStorage` for trivial flags only if needed.
- **LLM calls:** OpenAI-compatible API only; the base URL, model IDs, and API
  key are user-supplied via Settings. Two model roles: **main** (chat) and
  **utility** (memory extraction as content scrolls out of context).
- **Image generation:** Huggingface via `@huggingface/inference`
  `InferenceClient.textToImage()` — works browser-side, returns a `Blob`.
- **Code style:** Prettier (single quotes, trailing commas, 2-space). ESLint
  with `typescript-eslint` + `react-hooks` + `react-refresh`. Don't disable
  lint rules ad hoc; configure in `eslint.config.js` if needed.
- **Modular components:** keep files focused; do not write one giant file.

## Target layout

```
src/
  app/          # app shell, providers
  components/   # avatar, chat, settings, image-gen, story-game
  lib/          # llm, memory, providers, storage, safety
  hooks/        # react hooks
  types/        # shared TS types
  styles/       # theme, palette, animations
docs/           # plan.md and design docs
public/         # static assets (served as-is)
```

When adding code, place it in the matching `src/` subdirectory. Update
`docs/plan.md` if the layout or data model changes.

## Repo expectations

- Commit work in milestones (one phase = one or more commits).
- Keep `README.md` and `docs/` design docs updated as the project evolves.
- Cloud is for a 9-year-old. Layer a hardcoded kid-safe base system prompt under
  any user-editable personality. See `docs/plan.md` §Safety scaffolding.
