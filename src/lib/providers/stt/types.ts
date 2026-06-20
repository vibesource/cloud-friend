import type { STTConfig } from '@/types/db';

export interface ListenOptions {
  /** Fired whenever a partial transcript is available. */
  onPartial?: (text: string) => void;
  /** Fired if listening fails to start or errors mid-stream. */
  onError?: (err: Error) => void;
}

export interface ListenResult {
  /** Final transcript for the session. */
  text: string;
}

export interface STTProvider {
  readonly id: string;
  readonly label: string;
  isAvailable(): Promise<boolean>;
  /** Start listening. Resolves when speech is detected as finished or stop() is called. */
  listen(opts: ListenOptions): Promise<ListenResult>;
  /** Stop listening and resolve the listen() promise with what was captured. */
  stop(): void;
}

export interface STTProviderFactory {
  readonly id: string;
  create(config: STTConfig): STTProvider;
}
