# Privacy — what Cloud stores and where

Cloud AI runs **entirely in the browser**. There is no backend, no server-side
database, and no analytics. This document explains exactly what is stored, where,
and how to remove it.

## Where data lives

All data is stored locally in your browser's **IndexedDB** (via the Dexie
library). Nothing is uploaded to any server controlled by this app.

The only data that leaves the browser is:

1. **Chat messages** sent to the LLM provider you configure (e.g. OpenAI,
   Huggingface Router, or any OpenAI-compatible endpoint).
2. **Image prompts** sent to Huggingface when your child asks Cloud to draw.
3. **Text for speech** sent to your selected TTS provider (Web Speech is local;
   Kokoro is in-browser; hosted providers vary).

The API keys you enter in Settings are stored in IndexedDB and sent only to the
providers they belong to.

## What is stored locally

| Table      | Contents                                                 |
| ---------- | -------------------------------------------------------- |
| `messages` | All chat messages (user + Cloud), with timestamps.       |
| `facts`    | Extracted memories (preferences, interests, people).     |
| `images`   | Generated images as binary Blobs.                        |
| `meta`     | Story mode state, sticker progress, recall cooldown.     |
| `settings` | All configuration: API keys, personality, voice, safety. |

## How to remove data

All controls are in **Settings → Data & privacy**:

- **Export chat (JSON)**: downloads a human-readable copy of the conversation.
- **Clear chat**: deletes all messages. Memories and settings are kept.
- **Wipe everything**: deletes every table and reloads the app to a fresh state.

Individual memories can be deleted from **Settings → Cloud's memories**, and
individual stickers can be cleared from **Settings → Sticker album**.

Clearing the browser's site data (or "Clear browsing data → Cookies and site
data") also removes everything.

## Kid safety

- A hardcoded kid-safe system prompt is always layered under the editable
  personality.
- A keyword backstop filter (on by default) blocks unsafe words in both user
  input and Cloud's output.
- Image prompts are wrapped with kid-safe style tags before being sent.
- The app does not collect analytics, telemetry, or crash reports.

## Limitations

- Cloud's safety depends partly on the underlying LLM's training. The base
  prompt and keyword filter provide defense in depth, but no filter is perfect.
  Parental supervision is still recommended.
- If you use a hosted TTS or LLM provider, their own privacy policies apply to
  data sent to them.
