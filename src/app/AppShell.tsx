import { useState } from 'react';
import ChatView from '@/components/chat/ChatView';
import SettingsPanel from '@/components/settings/SettingsPanel';
import { useChat } from '@/hooks/useChat';
import { useVoice } from '@/hooks/useVoice';
import { saveSettings } from '@/lib/storage/hooks';
import styles from './AppShell.module.css';

export default function AppShell() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const chat = useChat();
  const voice = useVoice(chat.settings);
  const visibleEmotion = voice.speakingMessageId
    ? 'talking'
    : chat.cloudEmotion;

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <h1>☁️ Cloud</h1>
        <button
          className={styles.gear}
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
          title="Settings"
        >
          ⚙
        </button>
      </header>

      <main className={styles.main}>
        <ChatView
          messages={chat.messages}
          streaming={chat.streaming}
          error={chat.error ?? voice.error}
          emotion={visibleEmotion}
          ready={chat.ready}
          onSend={chat.send}
          onCancel={chat.cancel}
          onClearError={() => {
            chat.clearError();
            voice.clearVoiceError();
          }}
          onAvatarClick={chat.boop}
          speakingMessageId={voice.speakingMessageId}
          listening={voice.listening}
          transcriptPreview={voice.transcriptPreview}
          onSpeak={(messageId, text) =>
            void voice.speakMessage(messageId, text)
          }
          onStopSpeaking={voice.stopSpeaking}
          onListen={voice.listenOnce}
          onStopListening={voice.stopListening}
        />
      </main>

      {settingsOpen && chat.settings ? (
        <SettingsPanel
          settings={chat.settings}
          onClose={() => setSettingsOpen(false)}
          onSave={saveSettings}
        />
      ) : null}
    </div>
  );
}
