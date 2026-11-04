import { useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import WikimediaReviewPanel from '@/components/WikimediaReviewPanel';
import WordImage from '@/components/WordImage';
import { useLibrary } from '@/contexts/LibraryContext';
import {
  planAutoImages,
  toTwemojiAssignments,
  type AutoImageScope,
} from '@/lib/autoImages';

interface AutoImageModalProps {
  onClose: () => void;
}

const PREVIEW_LIMIT = 12;

const SCOPE_OPTIONS: { value: AutoImageScope; label: string; description: string }[] = [
  { value: 'missing', label: 'Yalnızca görseli olmayan kelimeler', description: 'Mevcut görseller değişmez.' },
  {
    value: 'all',
    label: 'Bütün kelimeler',
    description: 'Mevcut görseller emoji görseliyle değiştirilir. Kendi yüklediğiniz fotoğraflar korunur.',
  },
];

export default function AutoImageModal({ onClose }: AutoImageModalProps) {
  const { words, applyWordImages } = useLibrary();
  const [scope, setScope] = useState<AutoImageScope>('missing');
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ saved: number; errorMessage: string | null } | null>(null);

  const plan = useMemo(() => planAutoImages(words, scope), [words, scope]);
  const unmatchedWords = useMemo(() => {
    const matchedIds = new Set(planAutoImages(words, 'missing').map((item) => item.word.id));
    return words.filter((word) => !word.image_url && !matchedIds.has(word.id));
  }, [words]);
  const replacesExisting = scope === 'all' && plan.some((item) => item.word.image_url);
  const canApply = phase === 'idle' && plan.length > 0 && (!replacesExisting || confirmReplace);

  const handleApply = async () => {
    if (!canApply) return;
    setPhase('running');
    setProgress(0);
    const assignments = toTwemojiAssignments(plan, scope);
    const outcome = await applyWordImages(assignments, setProgress);
    setResult(outcome);
    setPhase('done');
  };

  const handleScopeChange = (next: AutoImageScope) => {
    setScope(next);
    setConfirmReplace(false);
  };

  return (
    <Modal title="Otomatik görsel ata" onClose={onClose} maxWidthClass="max-w-3xl">
      <div className="space-y-6">
        <p className="text-sm leading-relaxed text-slate-600">
          Kelimenin Fince veya Türkçe anlamı bir emojiyle birebir eşleşirse o emoji görsel olarak atanır. Eşleşme
          bulunmayan kelimelere görsel eklenmez. Görseller Twemoji (CC-BY 4.0) kaynağındandır.
        </p>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold text-slate-700">Hangi kelimeler?</legend>
          {SCOPE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer gap-3 rounded-xl border-2 px-4 py-3 transition ${
                scope === option.value ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
              } ${phase !== 'idle' ? 'pointer-events-none opacity-60' : ''}`}
            >
              <input
                type="radio"
                name="auto-image-scope"
                value={option.value}
                checked={scope === option.value}
                onChange={() => handleScopeChange(option.value)}
                className="mt-1 accent-blue-700"
              />
              <span>
                <span className="block font-semibold text-slate-900">{option.label}</span>
                <span className="block text-sm text-slate-600">{option.description}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {phase === 'idle' && (
          <section className="space-y-3">
            <p className="text-sm font-semibold text-slate-800">
              {plan.length} kelimeye görsel atanacak.
            </p>
            {plan.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Bu seçenekte eşleşen emoji bulunamadı.
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {plan.slice(0, PREVIEW_LIMIT).map((item) => (
                  <li key={item.word.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2">
                    <WordImage src={item.imageUrl} alt={item.label} fit="contain" className="h-10 w-10 shrink-0 rounded-lg p-1" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900">{item.word.finnish}</span>
                      <span className="block truncate text-xs text-slate-500">{item.word.turkish}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {plan.length > PREVIEW_LIMIT && (
              <p className="text-xs text-slate-500">İlk {PREVIEW_LIMIT} kelime gösteriliyor.</p>
            )}
            {replacesExisting && (
              <label className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <input
                  type="checkbox"
                  checked={confirmReplace}
                  onChange={(event) => setConfirmReplace(event.target.checked)}
                  className="mt-0.5 accent-amber-700"
                />
                Eşleşen kelimelerdeki mevcut görseller emoji görselleriyle değiştirilecek. Bunu onaylıyorum.
              </label>
            )}
          </section>
        )}

        {phase === 'idle' && unmatchedWords.length > 0 && (
          <section className="space-y-3 border-t border-slate-200 pt-5">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-800">Emoji bulunamayan kelimeler</h3>
              <p className="text-xs leading-relaxed text-slate-500">
                Bu kelimeler için Wikimedia Commons'ta arama yapıp uygun görseli kendiniz seçebilirsiniz. Seçim yapmadan görsel kaydedilmez.
              </p>
            </div>
            <WikimediaReviewPanel words={unmatchedWords} />
          </section>
        )}

        {phase === 'running' && (
          <p className="text-sm font-semibold text-slate-700" role="status">
            {progress} / {plan.length} kelime işleniyor...
          </p>
        )}

        {phase === 'done' && result && (
          <div className="space-y-2" role="status">
            {result.errorMessage ? (
              <>
                <p className="font-semibold text-rose-700">
                  {result.saved} kelimeye görsel kaydedildi, işlem bir hata nedeniyle durdu.
                </p>
                <p className="text-sm text-slate-600">{result.errorMessage}</p>
                <p className="text-sm text-slate-600">
                  Tekrar çalıştırdığınızda kalan kelimeler işlenir; kaydedilmiş görseller değişmez.
                </p>
              </>
            ) : (
              <p className="font-semibold text-emerald-700">{result.saved} kelimeye görsel atandı.</p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {phase === 'done' ? 'Kapat' : 'Vazgeç'}
          </button>
          {phase !== 'done' && (
            <button
              type="button"
              onClick={handleApply}
              disabled={!canApply}
              className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
            >
              {phase === 'running' ? 'Kaydediliyor...' : 'Görselleri ata'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
