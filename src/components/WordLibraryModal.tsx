import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, ChevronLeft, ChevronRight, Loader2, Search, Sparkles } from 'lucide-react';
import Modal from '@/components/Modal';
import { useLibrary } from '@/contexts/LibraryContext';
import { supabase } from '@/lib/supabase';
import { describeError } from '@/lib/errors';
import { normalizeFinnish, WORD_TYPE_OPTIONS, type WordFormValues, type WordType } from '@/lib/vocabulary';
import type { LibraryWord, LibraryFilters } from '@/lib/wordLibrary';

interface WordLibraryModalProps {
  onClose: () => void;
}

const PAGE_SIZE = 50;

const LEVEL_BADGE_COLORS: Record<string, string> = {
  A1: 'bg-emerald-100 text-emerald-700',
  A2: 'bg-teal-100 text-teal-700',
  B1: 'bg-blue-100 text-blue-700',
  B2: 'bg-indigo-100 text-indigo-700',
  C1: 'bg-amber-100 text-amber-700',
  C2: 'bg-rose-100 text-rose-700',
};

export default function WordLibraryModal({ onClose }: WordLibraryModalProps) {
  const { words, insertWords } = useLibrary();
  const [filters, setFilters] = useState<LibraryFilters>({
    search: '',
    levels: [],
    wordTypes: [],
    onlyWithLevel: false,
    onlyKotusValidated: false,
    sortBy: 'frequency',
  });
  const [page, setPage] = useState(0);
  const [results, setResults] = useState<LibraryWord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [maxCount, setMaxCount] = useState<number | ''>('');
  const [importPhase, setImportPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ inserted: number; errorMessage: string | null } | null>(null);

  const existingFinnishKeys = useMemo(
    () => new Set(words.map((w) => normalizeFinnish(w.finnish))),
    [words],
  );

  const fetchPage = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      let query = supabase
        .from('word_library')
        .select('*', { count: 'exact' });

      if (filters.search.trim()) {
        query = query.or(`finnish.ilike.%${filters.search.trim()}%,turkish.ilike.%${filters.search.trim()}%`);
      }
      if (filters.levels.length > 0) {
        query = query.in('level', filters.levels);
      }
      if (filters.wordTypes.length > 0) {
        query = query.in('word_type', filters.wordTypes);
      }
      if (filters.onlyWithLevel) {
        query = query.not('level', 'is', null);
      }
      if (filters.onlyKotusValidated) {
        query = query.eq('has_kotus_validation', true);
      }

      if (filters.sortBy === 'frequency') {
        query = query.order('frequency_rank', { ascending: true, nullsFirst: false });
      } else {
        query = query.order('finnish', { ascending: true });
      }

      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      setResults((data as LibraryWord[]) || []);
      setTotalCount(count || 0);
    } catch (error) {
      setLoadError(describeError(error));
      setResults([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void fetchPage();
  }, [fetchPage]);

  useEffect(() => {
    setPage(0);
  }, [filters]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const w of results) {
        if (!existingFinnishKeys.has(normalizeFinnish(w.finnish))) {
          next.add(w.id);
        }
      }
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const handleImport = async () => {
    const allSelected: LibraryWord[] = [];
    for (const w of results) {
      if (selected.has(w.id) && !existingFinnishKeys.has(normalizeFinnish(w.finnish))) {
        allSelected.push(w);
      }
    }

    let toInsert = allSelected;
    if (maxCount && maxCount > 0 && toInsert.length > maxCount) {
      toInsert = toInsert.slice(0, maxCount);
    }

    if (toInsert.length === 0) {
      setImportResult({ inserted: 0, errorMessage: 'Eklenecek yeni kelime yok. Seçilen kelimeler zaten kayıtlı olabilir.' });
      setImportPhase('done');
      return;
    }

    const formValues: WordFormValues[] = toInsert.map((w) => ({
      finnish: w.finnish,
      turkish: w.turkish,
      word_type: (w.word_type as WordType) || 'other',
      level: (w.level as WordFormValues['level']) || 'A1',
      category_id: null,
      image_url: null,
      image_source: null,
      image_credit: null,
      example_fi: null,
      example_tr: null,
      grammar_note: null,
    }));

    setImportPhase('running');
    setImportProgress(0);
    const outcome = await insertWords(formValues, setImportProgress);
    setImportResult(outcome);
    setImportPhase('done');
  };

  const toggleLevel = (level: string) => {
    setFilters((f) => ({
      ...f,
      levels: f.levels.includes(level) ? f.levels.filter((l) => l !== level) : [...f.levels, level],
    }));
  };

  const toggleWordType = (type: string) => {
    setFilters((f) => ({
      ...f,
      wordTypes: f.wordTypes.includes(type) ? f.wordTypes.filter((t) => t !== type) : [...f.wordTypes, type],
    }));
  };

  return (
    <Modal title="Kelime kütüphanesinden seç" onClose={onClose} maxWidthClass="max-w-5xl">
      {importPhase === 'running' && (
        <div className="space-y-4 py-8" role="status">
          <p className="text-center font-semibold text-slate-800">
            {importProgress} kelime ekleniyor...
          </p>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-700 transition-all duration-300"
              style={{ width: '100%' }}
            />
          </div>
        </div>
      )}

      {importPhase === 'done' && importResult && (
        <div className="space-y-4" role="status">
          {importResult.errorMessage ? (
            <>
              <p className="font-semibold text-rose-700">
                {importResult.inserted} kelime eklendi, işlem bir hata nedeniyle durdu.
              </p>
              <p className="text-sm text-slate-600">{importResult.errorMessage}</p>
            </>
          ) : importResult.inserted === 0 ? (
            <p className="font-semibold text-amber-700">{importResult.errorMessage || 'Kelime eklenmedi.'}</p>
          ) : (
            <p className="font-semibold text-emerald-700">{importResult.inserted} kelime kütüphanenize eklendi.</p>
          )}
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={() => { setImportPhase('idle'); setImportResult(null); clearSelection(); }}
              className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Tekrar seç
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-800"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {importPhase === 'idle' && (
        <div className="space-y-5">
          {/* Info banner */}
          <div className="flex items-start gap-3 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <p className="font-semibold">Kelime kütüphanesi</p>
              <p className="mt-0.5 text-blue-700">
                FreeDict (CC BY-SA 3.0), Kotus Nykysuomen sanalista (LGPL) ve FrequencyWords (CC BY-SA 4.0)
                kaynaklarından derlenmiş {totalCount.toLocaleString('tr-TR')} kelime. Seviyeler frekans verisinden
                tahmin edilmiştir, doğrulanmamış.
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            {/* Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                placeholder="Fince veya Türkçe ara..."
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Level filters */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Dil seviyesi (CEFR)</p>
              <div className="flex flex-wrap gap-2">
                {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => toggleLevel(level)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                      filters.levels.includes(level)
                        ? LEVEL_BADGE_COLORS[level] + ' ring-2 ring-offset-1 ring-current'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Word type filters */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Kelime türü</p>
              <div className="flex flex-wrap gap-2">
                {WORD_TYPE_OPTIONS.filter((t) => t.value !== 'phrase').map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => toggleWordType(type.value)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      filters.wordTypes.includes(type.value)
                        ? 'bg-blue-700 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={filters.onlyWithLevel}
                  onChange={(e) => setFilters((f) => ({ ...f, onlyWithLevel: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                />
                Sadece seviyeli kelimeler
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={filters.onlyKotusValidated}
                  onChange={(e) => setFilters((f) => ({ ...f, onlyKotusValidated: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                />
                Sadece Kotus doğrulamalı
              </label>
              <div className="ml-auto flex items-center gap-2 text-sm text-slate-700">
                <label htmlFor="sort">Sıralama:</label>
                <select
                  id="sort"
                  value={filters.sortBy}
                  onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value as 'frequency' | 'alphabetical' }))}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-500"
                >
                  <option value="frequency">Frekansa göre</option>
                  <option value="alphabetical">Alfabetik</option>
                </select>
              </div>
            </div>

            {/* Max count */}
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <label htmlFor="maxcount">En fazla:</label>
              <input
                id="maxcount"
                type="number"
                min={1}
                value={maxCount}
                onChange={(e) => setMaxCount(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10) || 0))}
                placeholder="Sınırsız"
                className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-500"
              />
              <span className="text-slate-500">kelime ekle</span>
            </div>
          </div>

          {/* Selection bar */}
          <div className="flex items-center justify-between rounded-xl bg-slate-100 px-4 py-2.5">
            <div className="text-sm font-semibold text-slate-700">
              {selected.size} kelime seçili
              {totalCount > 0 && <span className="ml-2 text-slate-500">/ {totalCount.toLocaleString('tr-TR')} sonuç</span>}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={selectAllOnPage} className="rounded-lg px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50">
                Sayfadakileri seç
              </button>
              {selected.size > 0 && (
                <button type="button" onClick={clearSelection} className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200">
                  Temizle
                </button>
              )}
            </div>
          </div>

          {/* Error */}
          {loadError && (
            <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {loadError}
            </p>
          )}

          {/* Results table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-700" />
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-500">
              <BookOpen className="h-8 w-8" />
              <p className="font-semibold">Sonuç bulunamadı</p>
              <p className="text-sm">Filtreleri değiştirerek tekrar deneyin.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="w-10 px-3 py-2.5"></th>
                    <th className="px-3 py-2.5 text-left">Fince</th>
                    <th className="px-3 py-2.5 text-left">Türkçe</th>
                    <th className="w-20 px-3 py-2.5 text-left">Tür</th>
                    <th className="w-16 px-3 py-2.5 text-left">Seviye</th>
                    <th className="w-20 px-3 py-2.5 text-center">Frekans</th>
                    <th className="w-16 px-3 py-2.5 text-center">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map((w) => {
                    const alreadyExists = existingFinnishKeys.has(normalizeFinnish(w.finnish));
                    const isSelected = selected.has(w.id);
                    return (
                      <tr
                        key={w.id}
                        className={`transition ${alreadyExists ? 'bg-slate-50 opacity-60' : isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                      >
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={alreadyExists}
                            onChange={() => toggleSelect(w.id)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-3 py-2.5 font-medium text-slate-900">{w.finnish}</td>
                        <td className="px-3 py-2.5 text-slate-700">{w.turkish}</td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {WORD_TYPE_OPTIONS.find((t) => t.value === w.word_type)?.label || w.word_type}
                        </td>
                        <td className="px-3 py-2.5">
                          {w.level ? (
                            <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${LEVEL_BADGE_COLORS[w.level] || 'bg-slate-100 text-slate-600'}`}>
                              {w.level}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs text-slate-500">
                          {w.frequency_rank ? `#${w.frequency_rank}` : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {alreadyExists ? (
                            <Check className="mx-auto h-4 w-4 text-emerald-600" />
                          ) : w.has_kotus_validation ? (
                            <span className="text-xs font-medium text-emerald-600" title="Kotus doğrulamalı">Kotus</span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Sayfa {page + 1} / {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" /> Önceki
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Sonraki <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            <p className="text-sm text-slate-600">
              {selected.size > 0
                ? `${selected.size} kelime seçildi${maxCount && maxCount > 0 ? ` (en fazla ${maxCount} eklenecek)` : ''}`
                : 'Kelime seçmek için kutucukları işaretleyin'}
            </p>
            <button
              type="button"
              onClick={handleImport}
              disabled={selected.size === 0}
              className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
            >
              Seçilenleri ekle
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
