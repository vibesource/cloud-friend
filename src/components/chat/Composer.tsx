import { useState, type KeyboardEvent } from 'react';
import styles from './Composer.module.css';

interface Props {
  onSend: (text: string) => void;
  onCancel: () => void;
  onListen?: () => Promise<string>;
  onStopListening?: () => void;
  onGenerateImage?: (prompt: string) => void;
  streaming: boolean;
  listening?: boolean;
  transcriptPreview?: string;
  /** True when an image is currently being generated. */
  imageGenerating?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export default function Composer({
  onSend,
  onCancel,
  onListen,
  onStopListening,
  onGenerateImage,
  streaming,
  listening,
  transcriptPreview,
  imageGenerating,
  disabled,
  placeholder,
}: Props) {
  const [text, setText] = useState('');
  const [drawingOpen, setDrawingOpen] = useState(false);
  const [drawingPrompt, setDrawingPrompt] = useState('');

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

  function submitDrawing() {
    const trimmed = drawingPrompt.trim();
    if (trimmed.length === 0 || !onGenerateImage) return;
    onGenerateImage(trimmed);
    setDrawingPrompt('');
    setDrawingOpen(false);
  }

  function handleDrawingKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitDrawing();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setDrawingOpen(false);
      setDrawingPrompt('');
    }
  }

  return (
    <div>
      {drawingOpen && onGenerateImage ? (
        <div className={styles.drawingRow}>
          <input
            className={styles.drawingInput}
            value={drawingPrompt}
            onChange={(e) => setDrawingPrompt(e.target.value)}
            onKeyDown={handleDrawingKeyDown}
            placeholder="What should Cloud draw?"
            autoFocus
            disabled={disabled || imageGenerating}
            aria-label="Image description for Cloud to draw"
          />
          <button
            className={styles.sendBtn}
            onClick={submitDrawing}
            disabled={
              drawingPrompt.trim().length === 0 || disabled || imageGenerating
            }
            aria-label="Ask Cloud to draw"
            title="Draw!"
          >
            🎨
          </button>
          <button
            className={styles.stopBtn}
            onClick={() => {
              setDrawingOpen(false);
              setDrawingPrompt('');
            }}
            aria-label="Cancel drawing"
            title="Cancel"
          >
            ×
          </button>
        </div>
      ) : (
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
          {onGenerateImage ? (
            <button
              className={styles.drawBtn}
              onClick={() => setDrawingOpen(true)}
              disabled={disabled || streaming || imageGenerating}
              aria-label="Ask Cloud to draw a picture"
              title="Draw a picture"
            >
              🎨
            </button>
          ) : null}
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
      )}
      <div className={styles.hint}>
        {imageGenerating ? (
          <span>Cloud is drawing…</span>
        ) : listening && transcriptPreview ? (
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
