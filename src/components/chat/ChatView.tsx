import type { Emotion } from '@/types/db';
import CloudAvatar from '@/components/cloud-avatar/CloudAvatar';
import Composer from './Composer';
import MessageList from './MessageList';
import type { Message } from '@/types/db';
import styles from './ChatView.module.css';

interface Props {
  messages: Message[];
  streaming: boolean;
  error: string | null;
  emotion: Emotion;
  ready: boolean;
  onSend: (text: string) => void;
  onCancel: () => void;
  onClearError: () => void;
  /** Tap on Cloud -> random cute reaction. No-op when streaming. */
  onAvatarClick?: () => void;
}

export default function ChatView({
  messages,
  streaming,
  error,
  emotion,
  ready,
  onSend,
  onCancel,
  onClearError,
  onAvatarClick,
}: Props) {
  return (
    <div className={styles.chat}>
      <header className={styles.banner}>
        <CloudAvatar
          emotion={emotion}
          size={120}
          onAvatarClick={onAvatarClick}
        />
        <h2>Cloud</h2>
        <div className={styles.status}>
          {streaming
            ? 'Cloud is typing…'
            : ready
              ? 'Cloud is here — tap to boop her!'
              : 'Almost ready…'}
        </div>
        {!ready && (
          <div className={styles.warning}>
            Open Settings (top right) to add your chat API key and models.
          </div>
        )}
      </header>

      <div className={styles.body}>
        <MessageList messages={messages} streaming={streaming} error={error} />
        <Composer
          onSend={(t) => {
            if (error) onClearError();
            onSend(t);
          }}
          onCancel={onCancel}
          streaming={streaming}
          disabled={!ready}
        />
      </div>
    </div>
  );
}
