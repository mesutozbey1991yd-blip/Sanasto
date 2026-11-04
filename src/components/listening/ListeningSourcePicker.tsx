import SelectionFilterFields from '@/components/SelectionFilterFields';
import SortDropdown from '@/components/SortDropdown';
import { useLibrary } from '@/contexts/LibraryContext';
import { LISTENING_SORT_OPTIONS, selectListeningWords, type ListeningSource } from '@/lib/listening';

interface ListeningSourcePickerProps {
  source: ListeningSource;
  onChange: (source: ListeningSource) => void;
}

export default function ListeningSourcePicker({ source, onChange }: ListeningSourcePickerProps) {
  const { words, categories } = useLibrary();
  const update = (patch: Partial<ListeningSource>) => onChange({ ...source, ...patch });

  const selectedCount = selectListeningWords(words, source).length;

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-700">Hangi kelimeleri dinlemek istersiniz?</p>

      <SelectionFilterFields
        categoryLabel="Ana kategoriler"
        categories={categories}
        words={words}
        filters={source}
        onChange={update}
        toggles={[
          {
            label: 'Sadece favoriler',
            checked: source.favoritesOnly,
            onChange: (favoritesOnly) => update({ favoritesOnly }),
          },
        ]}
      />

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-slate-700">Kelime sıralaması</legend>
        <SortDropdown
          label="Kelime sıralaması"
          options={LISTENING_SORT_OPTIONS}
          value={source.sort}
          onChange={(sort) => update({ sort })}
        />
      </fieldset>

      <p className="text-sm text-slate-600">
        {selectedCount > 0 ? `Bu seçimde ${selectedCount} kelime var.` : 'Bu seçimde dinlenecek kelime yok.'}
      </p>
    </section>
  );
}
