import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Message } from '@/types/db';
import MessageList from './MessageList';

vi.mock('@/hooks/useImageUrl', () => ({
  useImageUrl: (id: string | undefined) => (id ? 'blob:test' : null),
}));

beforeEach(() => {
  HTMLElement.prototype.scrollTo = vi.fn();
});
afterEach(cleanup);

const messages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Here is your picture!',
    ts: 1,
    imageId: 'image',
  },
];

function setup() {
  const { container, rerender } = render(
    <MessageList messages={messages} streaming={false} error={null} />,
  );
  const scroll = container.firstElementChild as HTMLDivElement;
  const scrollTo = vi.fn();
  Object.defineProperties(scroll, {
    scrollHeight: { configurable: true, value: 1000 },
    clientHeight: { configurable: true, value: 400 },
    scrollTop: { configurable: true, writable: true, value: 600 },
    scrollTo: { configurable: true, value: scrollTo },
  });
  return { scroll, scrollTo, rerender };
}

describe('image scrolling', () => {
  it('follows an image once it loads when the reader is at the bottom', () => {
    const { scroll, scrollTo } = setup();
    fireEvent.scroll(scroll);
    Object.defineProperty(scroll, 'scrollHeight', {
      configurable: true,
      value: 1300,
    });
    fireEvent.load(screen.getByAltText('Cloud drew this for you'));
    expect(scrollTo).toHaveBeenCalledWith({ top: 1300, behavior: 'auto' });
  });

  it('does not move the reader away from older messages', () => {
    const { scroll, scrollTo, rerender } = setup();
    scroll.scrollTop = 100;
    fireEvent.scroll(scroll);
    rerender(
      <MessageList messages={[...messages]} streaming={false} error={null} />,
    );
    fireEvent.load(screen.getByAltText('Cloud drew this for you'));
    expect(scrollTo).not.toHaveBeenCalled();
  });
});

describe('image cancellation', () => {
  it('offers a stop control on the drawing placeholder', () => {
    const onCancelImage = vi.fn();
    render(
      <MessageList
        messages={messages}
        streaming={false}
        error={null}
        imageGeneratingForMessageId="1"
        onCancelImage={onCancelImage}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Stop drawing' }));
    expect(onCancelImage).toHaveBeenCalledOnce();
  });
});
