import { useState } from 'react';
import { Headphones, Play } from 'lucide-react';
import { useStoredState } from '@/hooks/useStoredState';
import PageHeader from '@/components/PageHeader';
import ListeningPlayer from '@/components/listening/ListeningPlayer';
import ListeningSettingsPanel from '@/components/listening/ListeningSettingsPanel';
import ListeningSourcePicker from '@/components/listening/ListeningSourcePicker';
import { useLibrary } from '@/contexts/LibraryContext';
import {
  DEFAULT_LISTENING_SETTINGS,
  DEFAULT_LISTENING_SOURCE,
  selectListeningWords,
  type ListeningSettings,
  type ListeningSource,
} from '@/lib/listening';
import type { Word } from '@/lib/vocabulary';

export default function ListeningPage() {
  const { words } = useLibrary();
  const [source, setSource] = useStoredState<ListeningSource>(
    'sanasto.listeningSource.v3',
    DEFAULT_LISTENING_SOURCE,
  );
  const [settings, setSettings] = useStoredState<ListeningSettings>(
    'sanasto.listeningSettings',
    DEFAULT_LISTENING_SETTINGS,
  );
  const [queue, setQueue] = useState<Word[] | null>(null);

  if (queue) {
    return <ListeningPlayer queue={queue} settings={settings} onBack={() => setQueue(null)} />;
  }

  const selectedWords = selectListeningWords(words, source);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dinleme"
        description="Kelimeleri sırayla dinleyin. Fince ve Türkçe telaffuz sesli okunur."
      />

      <ListeningSourcePicker source={source} onChange={setSource} />
      <ListeningSettingsPanel settings={settings} onChange={setSettings} />

      <button
        type="button"
        onClick={() => setQueue(selectListeningWords(words, source))}
        disabled={selectedWords.length === 0}
        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-700 px-6 py-4 text-lg font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
      >
        {selectedWords.length > 0 ? <Play className="h-6 w-6" /> : <Headphones className="h-6 w-6" />}
        {selectedWords.length > 0 ? `Dinlemeye başla (${selectedWords.length} kelime)` : 'Dinlenecek kelime yok'}
      </button>
    </div>
  );
}
