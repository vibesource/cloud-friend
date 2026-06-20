import { useState, type KeyboardEvent } from 'react';
import styles from './Composer.module.css';

interface Props {
  onSend: (text: string) => void;
  onCancel: () => void;
  streaming: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export default function Composer({
  onSend,
  onCancel,
  streaming,
  disabled,
  placeholder,
}: Props) {
  const [text, setText] = useState('');

  function submit() {
    const trimmed = text.trim();
    if (trimmed.length === 0 || streaming || disabled) return;
    onSend(trimmed);
    setText('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div>
      <div className={styles.composer}>
        <textarea
          className={styles.textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'Type to Cloud…'}
          rows={1}
          disabled={disabled}
          aria-label="Message for Cloud"
        />
        {streaming ? (
          <button
            className={styles.stopBtn}
            onClick={onCancel}
            aria-label="Stop Cloud"
            title="Stop"
          >
            ■
          </button>
        ) : (
          <button
            className={styles.sendBtn}
            onClick={submit}
            disabled={text.trim().length === 0 || disabled}
            aria-label="Send"
            title="Send"
          >
            ↑
          </button>
        )}
      </div>
      <div className={styles.hint}>
        <span className={styles.kbd}>Enter</span> to send ·{' '}
        <span className={styles.kbd}>Shift+Enter</span> for a new line
      </div>
    </div>
  );
}
