import { useImageUrl } from '@/hooks/useImageUrl';
import styles from './MessageImage.module.css';

interface Props {
  imageId?: string;
  /** When true, show a Cloud is drawing… placeholder instead of an image. */
  generating?: boolean;
  cancelled?: boolean;
  onCancel?: () => void;
  onLoad?: () => void;
}

export default function MessageImage({
  imageId,
  generating,
  cancelled,
  onCancel,
  onLoad,
}: Props) {
  const url = useImageUrl(imageId);

  if (generating) {
    return (
      <div className={styles.imageWrapper}>
        <div className={styles.placeholder} aria-live="polite">
          <div className={styles.spinner} aria-hidden="true" />
          <span>Cloud is drawing…</span>
          {onCancel && (
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onCancel}
            >
              Stop drawing
            </button>
          )}
        </div>
      </div>
    );
  }

  if (cancelled && !imageId) {
    return (
      <div className={styles.cancelled} role="status">
        Drawing stopped.
      </div>
    );
  }
  if (!imageId || !url) return null;

  return (
    <div className={styles.imageWrapper}>
      <img
        className={styles.image}
        src={url}
        alt="Cloud drew this for you"
        loading="lazy"
        onLoad={onLoad}
      />
    </div>
  );
}
