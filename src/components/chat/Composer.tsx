import { useState, type KeyboardEvent } from 'react';
import styles from './Composer.module.css';

interface Props {
  onSend: (text: string) => void;
  onCancel: () => void;
  onListen?: () => Promise<string>;
  onStopListening?: () => void;
  streaming: boolean;
  listening?: boolean;
  transcriptPreview?: string;
  disabled?: boolean;
  placeholder?: string;
}

export default function Composer({
  onSend,
  onCancel,
  onListen,
  onStopListening,
  streaming,
  listening,
  transcriptPreview,
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

  async function handleListen() {
    if (!onListen || disabled || streaming) return;
    const result = await onListen();
    const trimmed = result.trim();
    if (trimmed.length > 0) {
      onSend(trimmed);
      setText('');
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
          placeholder={
            listening
              ? 'Listening…'
              : transcriptPreview || placeholder || 'Type to Cloud…'
          }
          rows={1}
          disabled={disabled}
          aria-label="Message for Cloud"
        />
        {onListen ? (
          listening ? (
            <button
              className={styles.micBtnListening}
              onClick={onStopListening}
              aria-label="Stop listening"
              title="Stop listening"
            >
              ●
            </button>
          ) : (
            <button
              className={styles.micBtn}
              onClick={() => void handleListen()}
              disabled={disabled || streaming}
              aria-label="Talk to Cloud"
              title="Talk to Cloud"
            >
              🎙
            </button>
          )
        ) : null}
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
        {listening && transcriptPreview ? (
          <span>Heard: “{transcriptPreview}”</span>
        ) : (
          <>
            <span className={styles.kbd}>Enter</span> to send ·{' '}
            <span className={styles.kbd}>Shift+Enter</span> for a new line
          </>
        )}
      </div>
    </div>
  );
}
