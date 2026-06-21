import type { CSSProperties } from 'react';
import type { CloudCustomization, Emotion } from '@/types/db';
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
  speakingMessageId?: string | null;
  listening?: boolean;
  transcriptPreview?: string;
  onSpeak?: (messageId: string, text: string) => void;
  onStopSpeaking?: () => void;
  onListen?: () => Promise<string>;
  onStopListening?: () => void;
  imageGeneratingForMessageId?: string | null;
  onGenerateImage?: (prompt: string) => void;
  cloud: CloudCustomization;
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
  speakingMessageId,
  listening,
  transcriptPreview,
  onSpeak,
  onStopSpeaking,
  onListen,
  onStopListening,
  imageGeneratingForMessageId,
  onGenerateImage,
  cloud,
}: Props) {
  return (
    <div className={styles.chat}>
      <header
        className={styles.banner}
        style={
          { '--cloud-avatar-backdrop': cloud.backdropColor } as CSSProperties
        }
      >
        <CloudAvatar
          emotion={emotion}
          size={120}
          onAvatarClick={onAvatarClick}
          earColor={cloud.earColor}
          cloudColor={cloud.cloudColor}
          hornEnabled={cloud.hornEnabled}
        />
        <h2>{cloud.displayName || 'Cloud'}</h2>
        <div className={styles.status}>
          {streaming
            ? 'Cloud is typing…'
            : speakingMessageId
              ? 'Cloud is speaking…'
              : listening
                ? 'Cloud is listening…'
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
        <MessageList
          messages={messages}
          streaming={streaming}
          error={error}
          speakingMessageId={speakingMessageId}
          onSpeak={onSpeak}
          onStopSpeaking={onStopSpeaking}
          imageGeneratingForMessageId={imageGeneratingForMessageId}
        />
        <Composer
          onSend={(t) => {
            if (error) onClearError();
            onSend(t);
          }}
          onCancel={onCancel}
          onListen={onListen}
          onStopListening={onStopListening}
          onGenerateImage={onGenerateImage}
          streaming={streaming}
          listening={listening}
          transcriptPreview={transcriptPreview}
          imageGenerating={!!imageGeneratingForMessageId}
          disabled={!ready}
        />
      </div>
    </div>
  );
}
