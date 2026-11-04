import { useMemo, useState } from 'react';
import { ClipboardPaste, Upload } from 'lucide-react';
import ImportReviewPanel from '@/components/ImportReviewPanel';
import Modal from '@/components/Modal';
import { useLibrary } from '@/contexts/LibraryContext';
import { parseOfficeImport } from '@/lib/officeImport';
import { extractPdfText } from '@/lib/pdfImport';
import {
  buildImportPreview,
  detectImportFormat,
  guessMapping,
  IMPORT_MAX_BYTES,
  parseImportFile,
  type ColumnMapping,
  type ImportDefaults,
  type ParsedTable,
} from '@/lib/wordImport';
import type { WordFormValues } from '@/lib/vocabulary';

interface WordImportModalProps {
  onClose: () => void;
}

type Phase = 'pick' | 'review' | 'running' | 'done';
type InputMode = 'paste' | 'file';

const INITIAL_DEFAULTS: ImportDefaults = { level: null, wordType: 'other' };

const MODE_TABS: { value: InputMode; label: string; icon: typeof Upload }[] = [
  { value: 'paste', label: 'Metin yapıştır', icon: ClipboardPaste },
  { value: 'file', label: 'Dosya yükle', icon: Upload },
];

export default function WordImportModal({ onClose }: WordImportModalProps) {
  const { categories, words, insertWords } = useLibrary();
  const [phase, setPhase] = useState<Phase>('pick');
  const [inputMode, setInputMode] = useState<InputMode>('paste');
  const [pickError, setPickError] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [table, setTable] = useState<ParsedTable | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [defaults, setDefaults] = useState<ImportDefaults>(INITIAL_DEFAULTS);
  const [progress, setProgress] = useState(0);
  const [toInsertCount, setToInsertCount] = useState(0);
  const [result, setResult] = useState<{ inserted: number; errorMessage: string | null } | null>(null);

  const rows = useMemo(
    () => (table ? buildImportPreview(table, mapping, defaults, categories, words) : []),
    [table, mapping, defaults, categories, words],
  );

  const loadParsedTable = (parsed: ParsedTable) => {
    setTable(parsed);
    setMapping(guessMapping(parsed.headers));
    setDefaults(INITIAL_DEFAULTS);
    setPhase('review');
  };

  const handlePaste = () => {
    setPickError(null);
    try {
      loadParsedTable(parseImportFile(pasteText, 'txt'));
    } catch (error) {
      setPickError(error instanceof Error ? error.message : 'Metin okunamadı.');
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setPickError(null);
    if (file.size > IMPORT_MAX_BYTES) {
      setPickError('Dosya 5 MB\'tan büyük. Daha küçük parçalara bölerek yükleyin.');
      return;
    }
    const format = detectImportFormat(file.name);
    if (!format) {
      setPickError('Bu dosya türü desteklenmiyor. CSV, TXT veya JSON dosyası yükleyin.');
      return;
    }
    try {
      const parsed =
        format === 'pdf'
          ? parseImportFile(await extractPdfText(await file.arrayBuffer()), 'txt')
          : format === 'xlsx' || format === 'docx'
            ? await parseOfficeImport(await file.arrayBuffer(), format)
            : parseImportFile(await file.text(), format);
      loadParsedTable(parsed);
    } catch (error) {
      setPickError(error instanceof Error ? error.message : 'Dosya okunamadı.');
    }
  };

  const handleStart = async () => {
    const toInsert: WordFormValues[] = rows.flatMap((row) => (row.status === 'ready' && row.values ? [row.values] : []));
    setToInsertCount(toInsert.length);
    setProgress(0);
    setPhase('running');
    const outcome = await insertWords(toInsert, setProgress);
    setResult(outcome);
    setPhase('done');
  };

  const handleBackToPick = () => {
    setTable(null);
    setPickError(null);
    setPhase('pick');
  };

  return (
    <Modal title="Toplu kelime ekle" onClose={onClose} maxWidthClass="max-w-4xl">
      {phase === 'pick' && (
        <div className="space-y-5">
          <div role="tablist" className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            {MODE_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = inputMode === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setInputMode(tab.value);
                    setPickError(null);
                  }}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                    active ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" /> {tab.label}
                </button>
              );
            })}
          </div>

          {inputMode === 'paste' && (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-slate-600">
                Her satıra bir kelime yazın: "Fince - Türkçe". Ayraç olarak tab, | veya ; de kullanabilirsiniz. Dil
                seviyesi ve kelime türü bir sonraki adımda seçilir.
              </p>
              <textarea
                value={pasteText}
                onChange={(event) => setPasteText(event.target.value)}
                rows={10}
                placeholder={'kissa - kedi\nkoira - köpek\nomena - elma'}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handlePaste}
                  disabled={pasteText.trim() === ''}
                  className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
                >
                  Önizle
                </button>
              </div>
            </div>
          )}

          {inputMode === 'file' && (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-slate-600">
                CSV, TXT, JSON, Excel (XLSX), Word (DOCX) veya PDF dosyası seçin. Tabloda ilk satır sütun başlığı olmalıdır.
                PDF dosyalarında da metin tabanlı olmalı; her satır "Fince - Türkçe" biçiminde olabilir. Dosyalar UTF-8 kodlamasıyla kaydedilmelidir.
              </p>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center transition hover:border-blue-400 hover:bg-blue-50">
                <Upload className="h-8 w-8 text-blue-700" aria-hidden="true" />
                <span className="font-semibold text-slate-800">Dosya seçmek için tıklayın</span>
                <span className="text-xs text-slate-500">CSV, TXT, JSON, XLSX, DOCX veya PDF, en fazla 5 MB</span>
                <input
                  type="file"
                  accept=".csv,.txt,.json,.xlsx,.docx,.pdf,application/pdf,text/csv,text/plain,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="sr-only"
                  onChange={(event) => {
                    void handleFile(event.target.files?.[0]);
                    event.target.value = '';
                  }}
                />
              </label>
            </div>
          )}

          {pickError && (
            <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {pickError}
            </p>
          )}
        </div>
      )}

      {phase === 'review' && table && (
        <ImportReviewPanel
          table={table}
          mapping={mapping}
          onMappingChange={setMapping}
          defaults={defaults}
          onDefaultsChange={setDefaults}
          rows={rows}
          onStart={handleStart}
          onBack={handleBackToPick}
        />
      )}

      {phase === 'running' && (
        <div className="space-y-4 py-6" role="status">
          <p className="text-center font-semibold text-slate-800">
            {progress} / {toInsertCount} kelime ekleniyor...
          </p>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-700 transition-all duration-300"
              style={{ width: `${toInsertCount === 0 ? 0 : Math.round((progress / toInsertCount) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {phase === 'done' && result && (
        <div className="space-y-4" role="status">
          {result.errorMessage ? (
            <>
              <p className="font-semibold text-rose-700">
                {result.inserted} kelime eklendi, işlem bir hata nedeniyle durdu.
              </p>
              <p className="text-sm text-slate-600">{result.errorMessage}</p>
              <p className="text-sm text-slate-600">
                Aynı kelimeleri tekrar eklediğinizde zaten kayıtlı olanlar atlanır; kalanlar eklenir.
              </p>
            </>
          ) : (
            <p className="font-semibold text-emerald-700">{result.inserted} kelime eklendi.</p>
          )}
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={handleBackToPick}
              className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Yeni ekleme yap
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
    </Modal>
  );
}
