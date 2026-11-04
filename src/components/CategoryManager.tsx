import { useMemo, useState, type FormEvent } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import CategoryPanel from '@/components/CategoryPanel';
import ConfirmModal from '@/components/ConfirmModal';
import EmptyState from '@/components/EmptyState';
import { useLibrary } from '@/contexts/LibraryContext';
import { describeError } from '@/lib/errors';
import { CATEGORY_SORT_OPTIONS } from '@/lib/categorySort';
import { DEFAULT_CATEGORY_NAMES, type Category, type Word } from '@/lib/vocabulary';

export default function CategoryManager() {
  const {
    categories,
    categorySortMode: sortMode,
    setCategorySortMode,
    words,
    addCategory,
    renameCategory,
    deleteCategory,
    seedDefaultCategories,
    reorderCategories,
  } = useLibrary();
  const [newCategory, setNewCategory] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

  const wordsByCategory = useMemo(() => {
    const grouped = new Map<string, Word[]>();
    for (const word of words) {
      if (!word.category_id) continue;
      const list = grouped.get(word.category_id) ?? [];
      list.push(word);
      grouped.set(word.category_id, list);
    }
    return grouped;
  }, [words]);

  const existingNames = new Set(categories.map((category) => category.name.toLocaleLowerCase('tr-TR')));
  const missingDefaults = DEFAULT_CATEGORY_NAMES.filter(
    (name) => !existingNames.has(name.toLocaleLowerCase('tr-TR')),
  ).length;

  const runAction = async (action: () => Promise<unknown>): Promise<boolean> => {
    setError(null);
    try {
      await action();
      return true;
    } catch (err) {
      setError(describeError(err));
      return false;
    }
  };

  const handleAddCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newCategory.trim();
    if (!name) return;
    if (await runAction(() => addCategory(name))) setNewCategory('');
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    await runAction(() => seedDefaultCategories());
    setIsSeeding(false);
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= categories.length) return;
    const ids = categories.map((category) => category.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    void runAction(() => reorderCategories(ids));
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await deleteCategory(pendingDelete.id);
  };

  const pendingMessage = (() => {
    if (!pendingDelete) return '';
    const count = wordsByCategory.get(pendingDelete.id)?.length ?? 0;
    const wordNote =
      count > 0
        ? `Bu kategorideki ${count} kelime silinmez, yalnızca kategori bilgisi temizlenir.`
        : 'Bu kategoride kelime yok.';
    return `"${pendingDelete.name}" kategorisi silinecek. ${wordNote}`;
  })();

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <form onSubmit={handleAddCategory} className="flex flex-col gap-3 sm:flex-row">
          <input
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
            maxLength={80}
            placeholder="Yeni ana kategori adı"
            aria-label="Yeni ana kategori adı"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={!newCategory.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:opacity-40"
          >
            <Plus className="h-5 w-5" /> Kategori ekle
          </button>
        </form>

        {missingDefaults > 0 && (
          <div className="flex flex-col gap-3 rounded-xl bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-amber-900">
              Hazır konu listesinde {missingDefaults} kategori henüz yok. İsterseniz hepsini tek seferde ekleyebilirsiniz.
            </p>
            <button
              type="button"
              onClick={handleSeed}
              disabled={isSeeding}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 font-semibold text-slate-900 transition hover:bg-amber-400 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" /> {isSeeding ? 'Ekleniyor...' : 'Hazır listeyi ekle'}
            </button>
          </div>
        )}

        {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      </section>

      {categories.length === 0 ? (
        <EmptyState
          title="Henüz kategori yok"
          text="Yukarıdan kendi kategorinizi ekleyin ya da hazır konu listesini tek seferde ekleyin."
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              {sortMode === 'manual'
                ? 'Kategorileri ok düğmeleriyle yukarı veya aşağı taşıyabilirsiniz.'
                : 'Kategoriler alfabetik olarak listeleniyor.'}
            </p>
            <div role="group" aria-label="Kategori sıralaması" className="inline-flex shrink-0 gap-1 rounded-xl bg-slate-100 p-1">
              {CATEGORY_SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={sortMode === option.value}
                  onClick={() => setCategorySortMode(option.value)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    sortMode === option.value ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            {categories.map((category, index) => (
              <CategoryPanel
                key={category.id}
                category={category}
                words={wordsByCategory.get(category.id) ?? []}
                onRename={(name) => renameCategory(category.id, name)}
                onRequestDelete={() => setPendingDelete(category)}
                canMoveUp={index > 0}
                canMoveDown={index < categories.length - 1}
                onMove={sortMode === 'manual' ? (direction) => moveCategory(index, direction) : undefined}
              />
            ))}
          </div>
        </>
      )}

      {pendingDelete && (
        <ConfirmModal
          title="Ana kategoriyi sil"
          message={pendingMessage}
          confirmLabel="Evet, sil"
          onConfirm={confirmDelete}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
