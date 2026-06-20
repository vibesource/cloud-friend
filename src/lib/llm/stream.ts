import type { LLMConfig, Message } from '@/types/db';

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamOptions {
  config: LLMConfig;
  messages: ChatTurn[];
  signal?: AbortSignal;
  temperature?: number;
  maxTokens?: number;
}

export class LLMError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'LLMError';
    this.status = status;
  }
}

function assertConfigured(config: LLMConfig): void {
  if (!config.baseUrl.trim()) {
    throw new LLMError(
      'No LLM base URL set. Open Settings to configure Cloud.',
    );
  }
  if (!config.apiKey.trim()) {
    throw new LLMError('No API key set. Open Settings to configure Cloud.');
  }
  if (!config.mainModel.trim()) {
    throw new LLMError('No main model set. Open Settings to configure Cloud.');
  }
}

function resolveBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, '');
  return trimmed.endsWith('/chat/completions')
    ? trimmed
    : `${trimmed}/v1/chat/completions`;
}

export async function streamChat(
  opts: StreamOptions,
): Promise<AsyncIterable<string>> {
  assertConfigured(opts.config);

  const url = resolveBaseUrl(opts.config.baseUrl);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.config.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.config.mainModel,
      messages: opts.messages,
      stream: true,
      temperature: opts.temperature ?? 0.7,
      ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
    }),
    signal: opts.signal,
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    throw new LLMError(
      `Chat request failed (${res.status}). ${bodyText.slice(0, 200)}`,
      res.status,
    );
  }

  if (!res.body) {
    throw new LLMError('No response body from chat endpoint.');
  }

  return parseSSEStream(res.body);
}

async function* parseSSEStream(
  body: ReadableStream<Uint8Array>,
): AsyncIterable<string> {
  const decoder = new TextDecoder();
  const reader = body.getReader();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let nlIdx: number;
      while ((nlIdx = buffer.indexOf('\n')) >= 0) {
        const rawLine = buffer.slice(0, nlIdx);
        buffer = buffer.slice(nlIdx + 1);
        const line = rawLine.replace(/\r$/, '').trim();
        if (!line) continue;
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') return;

        try {
          const json = JSON.parse(data) as {
            choices?: { delta?: { content?: string } }[];
          };
          const delta = json.choices?.[0]?.delta?.content;
          if (typeof delta === 'string' && delta.length > 0) {
            yield delta;
          }
        } catch {
          // Partial JSON chunk — ignore, the next read should complete it.
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function toChatTurns(messages: Message[]): ChatTurn[] {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}
