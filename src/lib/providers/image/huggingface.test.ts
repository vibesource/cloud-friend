import { beforeEach, describe, expect, it, vi } from 'vitest';
import { huggingfaceImageFactory } from './huggingface';

const { textToImage } = vi.hoisted(() => ({ textToImage: vi.fn() }));
vi.mock('@huggingface/inference', () => ({
  InferenceClient: class {
    textToImage = textToImage;
  },
}));

const createProvider = () =>
  huggingfaceImageFactory.create({
    apiKey: 'test',
    model: 'test-model',
    width: 512,
    height: 512,
  });

beforeEach(() => {
  textToImage.mockReset();
});

describe('Hugging Face image cancellation', () => {
  it('passes the abort signal to the SDK', async () => {
    const controller = new AbortController();
    const image = new Blob(['image']);
    textToImage.mockResolvedValue(image);
    await expect(
      createProvider().generate('a cat', { signal: controller.signal }),
    ).resolves.toBe(image);
    expect(textToImage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it('does not start a request that was already cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      createProvider().generate('a cat', { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(textToImage).not.toHaveBeenCalled();
  });

  it('preserves cancellation errors instead of turning them into provider errors', async () => {
    const controller = new AbortController();
    let finish!: (blob: Blob) => void;
    textToImage.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const work = createProvider().generate('a cat', {
      signal: controller.signal,
    });
    await vi.waitFor(() => expect(finish).toBeDefined());
    controller.abort();
    finish(new Blob(['late image']));
    await expect(work).rejects.toMatchObject({ name: 'AbortError' });
  });
});
