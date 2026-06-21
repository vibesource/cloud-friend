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
}

export default function MessageList({
  messages,
  streaming,
  error,
  speakingMessageId,
  onSpeak,
  onStopSpeaking,
  imageGeneratingForMessageId,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, error]);

  if (messages.length === 0 && !error) {
    return (
      <div className={styles.scroll} ref={scrollRef}>
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
    <div className={styles.scroll} ref={scrollRef}>
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
                />
              ) : null}
            </div>
          </div>
        );
      })}
      {error && (
        <div className={`${styles.row} ${styles.user}`}>
          <div className={`${styles.bubble} ${styles.error}`}>{error}</div>
        </div>
      )}
    </div>
  );
}
