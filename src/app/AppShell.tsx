import { useState } from 'react';
import ChatView from '@/components/chat/ChatView';
import SettingsPanel from '@/components/settings/SettingsPanel';
import { useChat } from '@/hooks/useChat';
import { useVoice } from '@/hooks/useVoice';
import { useImageGen } from '@/hooks/useImageGen';
import { db } from '@/lib/storage/db';
import { saveSettings } from '@/lib/storage/hooks';
import styles from './AppShell.module.css';

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export default function AppShell() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const chat = useChat();
  const voice = useVoice(chat.settings);
  const imageGen = useImageGen(chat.settings);
  const visibleEmotion = voice.speakingMessageId
    ? 'talking'
    : imageGen.generatingForMessageId
      ? 'thinking'
      : chat.cloudEmotion;

  async function handleGenerateImage(prompt: string) {
    // Insert a placeholder assistant message, then kick off generation.
    const placeholderId = makeId();
    const friendly = prompt.length > 60 ? prompt.slice(0, 57) + '…' : prompt;
    await db.messages.put({
      id: placeholderId,
      role: 'assistant',
      content: `Okay! Let me draw **${friendly}** for you 🎨`,
      emotion: 'thinking',
      ts: Date.now(),
    });
    await imageGen.generateForMessage(placeholderId, prompt);
  }

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
          error={chat.error ?? voice.error ?? imageGen.error}
          emotion={visibleEmotion}
          ready={chat.ready}
          onSend={chat.send}
          onCancel={chat.cancel}
          onClearError={() => {
            chat.clearError();
            voice.clearVoiceError();
            imageGen.clearError();
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
          imageGeneratingForMessageId={imageGen.generatingForMessageId}
          onGenerateImage={(prompt) => void handleGenerateImage(prompt)}
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
