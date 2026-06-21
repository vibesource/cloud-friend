export interface GenerateOptions {
  /** Bumped when the user aborts mid-generation. */
  signal?: AbortSignal;
  /** Optional progress notifications (provider support varies). */
  onProgress?: (ratio: number, message: string) => void;
}

export interface ImageProvider {
  readonly id: string;
  readonly label: string;
  /** True if this provider is usable right now (deps loaded, configured). */
  isAvailable(): Promise<boolean>;
  /**
   * Generate an image for the given prompt. Returns a Blob (typically PNG/JPEG).
   * The provider is responsible for any safety wrapping of the prompt.
   */
  generate(prompt: string, opts?: GenerateOptions): Promise<Blob>;
}

export interface ImageProviderFactory {
  readonly id: string;
  create(config: {
    apiKey: string;
    model: string;
    width: number;
    height: number;
  }): ImageProvider;
}
