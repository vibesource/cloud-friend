import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Message } from '@/types/db';
import MessageImage from './MessageImage';
import styles from './MessageList.module.css';

interface Props {
  messages: Message[];
  streaming: boolean;
  error: string | null;
  speakingMessageId?: string | null;
  onSpeak?: (messageId: string, text: string) => void;
  onStopSpeaking?: () => void;
  /** Message id currently generating an image (shows placeholder). */
  imageGeneratingForMessageId?: string | null;
  imageCancelledForMessageId?: string | null;
  onCancelImage?: () => void;
  onDismissError?: () => void;
}

export default function MessageList({
  messages,
  streaming,
  error,
  speakingMessageId,
  onSpeak,
  onStopSpeaking,
  imageGeneratingForMessageId,
  imageCancelledForMessageId,
  onCancelImage,
  onDismissError,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const followingRef = useRef(true);

  function trackScroll() {
    const el = scrollRef.current;
    if (!el) return;
    followingRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight <= 64;
  }

  function followImage() {
    const el = scrollRef.current;
    if (el && followingRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
    }
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !followingRef.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
  }, [messages, error]);

  useEffect(() => {
    if (imageGeneratingForMessageId) {
      const el = scrollRef.current;
      if (el && followingRef.current) {
        el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
      }
    }
  }, [imageGeneratingForMessageId]);

  if (messages.length === 0 && !error) {
    return (
      <div className={styles.scroll} ref={scrollRef} onScroll={trackScroll}>
        <div className={styles.empty}>
          <p>
            Say hi to Cloud! She&apos;s a cat riding a cloud and she&apos;d love
            to chat. 🐱☁️
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.scroll} ref={scrollRef} onScroll={trackScroll}>
      {messages.map((m, i) => {
        const isLast = i === messages.length - 1;
        const showCaret = streaming && m.role === 'assistant' && isLast;
        return (
          <div key={m.id} className={`${styles.row} ${styles[m.role]}`}>
            <div
              className={`${styles.bubble} ${styles[m.role]}${showCaret ? ` ${styles.streaming}` : ''}`}
            >
              {m.role === 'assistant' && m.content.length > 0 && onSpeak ? (
                <button
                  className={styles.speakBtn}
                  onClick={() =>
                    speakingMessageId === m.id
                      ? onStopSpeaking?.()
                      : onSpeak(m.id, m.content)
                  }
                  aria-label={
                    speakingMessageId === m.id
                      ? 'Stop speaking'
                      : 'Read this message aloud'
                  }
                  title={
                    speakingMessageId === m.id ? 'Stop speaking' : 'Read aloud'
                  }
                >
                  {speakingMessageId === m.id ? '■' : '🔊'}
                </button>
              ) : null}
              {m.content.length > 0 ? (
                <ReactMarkdown>{m.content}</ReactMarkdown>
              ) : (
                <span aria-label="Cloud is thinking">…</span>
              )}
              {m.role === 'assistant' ? (
                <MessageImage
                  imageId={m.imageId}
                  generating={imageGeneratingForMessageId === m.id}
                  cancelled={imageCancelledForMessageId === m.id}
                  onCancel={onCancelImage}
                  onLoad={followImage}
                />
              ) : null}
            </div>
          </div>
        );
      })}
      {error && (
        <div className={`${styles.row} ${styles.user}`}>
          <div className={`${styles.bubble} ${styles.error}`}>
            {error}
            {onDismissError ? (
              <button
                className={styles.dismissBtn}
                onClick={onDismissError}
                aria-label="Dismiss"
              >
                ×
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
