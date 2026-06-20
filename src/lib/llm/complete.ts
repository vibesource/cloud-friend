import type { LLMConfig, Message } from '@/types/db';
import { type ChatTurn, LLMError, streamChat } from './stream';

export interface CompleteOptions {
  config: LLMConfig;
  messages: ChatTurn[];
  signal?: AbortSignal;
  temperature?: number;
  maxTokens?: number;
  /** Override the model (e.g. utility model). Defaults to config.utilityModel. */
  model?: string;
}

export async function complete(opts: CompleteOptions): Promise<string> {
  const model = opts.model?.trim() || opts.config.utilityModel.trim();
  if (!model) {
    throw new LLMError(
      'No utility model set. Open Settings to configure the utility model.',
    );
  }

  const stream = await streamChat({
    config: { ...opts.config, mainModel: model },
    messages: opts.messages,
    signal: opts.signal,
    temperature: opts.temperature ?? 0.3,
    maxTokens: opts.maxTokens ?? 600,
  });

  let out = '';
  for await (const chunk of stream) out += chunk;
  return out.trim();
}

export function toChatTurns(messages: Message[]): ChatTurn[] {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}
