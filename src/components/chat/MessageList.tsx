import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Message } from '@/types/db';
import styles from './MessageList.module.css';

interface Props {
  messages: Message[];
  streaming: boolean;
  error: string | null;
}

export default function MessageList({ messages, streaming, error }: Props) {
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
              {m.content.length > 0 ? (
                <ReactMarkdown>{m.content}</ReactMarkdown>
              ) : (
                <span aria-label="Cloud is thinking">…</span>
              )}
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
