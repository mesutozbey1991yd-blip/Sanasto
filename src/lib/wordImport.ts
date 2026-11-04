import {
  LEVEL_OPTIONS,
  normalizeFinnish,
  WORD_TYPE_OPTIONS,
  type Category,
  type Level,
  type Word,
  type WordFormValues,
  type WordType,
} from '@/lib/vocabulary';

export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 5000;
const MAX_TEXT_LENGTH = 300;

export type ImportFormat = 'csv' | 'txt' | 'json' | 'xlsx' | 'docx' | 'pdf';

export type ImportTarget =
  | 'finnish'
  | 'turkish'
  | 'level'
  | 'word_type'
  | 'category'
  | 'example_fi'
  | 'example_tr'
  | 'grammar_note';

export const IMPORT_TARGETS: { key: ImportTarget; label: string; required: boolean; aliases: string[] }[] = [
  { key: 'finnish', label: 'Fince kelime', required: true, aliases: ['finnish', 'fince', 'fince kelime', 'kelime', 'word'] },
  {
    key: 'turkish',
    label: 'Türkçe anlamı',
    required: true,
    aliases: ['turkish', 'turkce', 'türkçe', 'türkçe anlamı', 'turkce anlami', 'anlam', 'meaning'],
  },
  { key: 'level', label: 'Dil seviyesi', required: false, aliases: ['level', 'seviye', 'dil seviyesi'] },
  { key: 'word_type', label: 'Kelime türü', required: false, aliases: ['word_type', 'tür', 'kelime türü', 'type'] },
  { key: 'category', label: 'Ana kategori', required: false, aliases: ['category', 'kategori', 'ana kategori'] },
  { key: 'example_fi', label: 'Örnek Fince cümle', required: false, aliases: ['example_fi', 'örnek', 'örnek cümle', 'example'] },
  {
    key: 'example_tr',
    label: 'Örnek cümlenin Türkçe anlamı',
    required: false,
    aliases: ['example_tr', 'örnek anlam', 'örnek çeviri'],
  },
  { key: 'grammar_note', label: 'Dilbilgisi notu', required: false, aliases: ['grammar_note', 'not', 'dilbilgisi notu', 'grammar'] },
];

export type ColumnMapping = Partial<Record<ImportTarget, number>>;

export interface ParsedTable {
  headers: string[];
  rows: string[][];
}

export interface ImportDefaults {
  level: Level | null;
  wordType: WordType;
}

export type ImportRowStatus = 'ready' | 'duplicate' | 'invalid';

export interface ImportPreviewRow {
  recordNumber: number;
  values: WordFormValues | null;
  status: ImportRowStatus;
  issues: string[];
}

function normalizeHeader(text: string): string {
  return text.trim().toLocaleLowerCase('tr-TR');
}

export function detectImportFormat(fileName: string): ImportFormat | null {
  const extension = fileName.split('.').pop()?.toLowerCase();
  const formats: string[] = ['csv', 'txt', 'json', 'xlsx', 'docx', 'pdf'];
  return formats.includes(extension ?? '') ? (extension as ImportFormat) : null;
}

function detectDelimiter(text: string): ';' | ',' {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return semicolons >= commas ? ';' : ',';
}

function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((items) => items.some((item) => item.trim() !== ''));
}

function parseCsvTable(text: string): ParsedTable {
  const rows = parseDelimited(text, detectDelimiter(text));
  if (rows.length < 2) throw new Error('Dosyada bir başlık satırı ve en az bir kelime olmalı.');
  return { headers: rows[0], rows: rows.slice(1) };
}

function parseTxtTable(text: string): ParsedTable {
  const rows = text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const separator = line.match(/\t|\||;| - /);
      if (!separator || separator.index === undefined) return [line.trim(), ''];
      return [line.slice(0, separator.index).trim(), line.slice(separator.index + separator[0].length).trim()];
    });
  return { headers: ['finnish', 'turkish'], rows };
}

function parseJsonTable(text: string): ParsedTable {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('JSON dosyası okunamadı. Dosyanın biçimini kontrol edin.');
  }
  if (!Array.isArray(data) || data.some((item) => typeof item !== 'object' || item === null)) {
    throw new Error('JSON dosyası, kelime nesnelerinden oluşan bir liste olmalı.');
  }
  const objects = data as Record<string, unknown>[];
  const headers = [...new Set(objects.flatMap((item) => Object.keys(item)))];
  const rows = objects.map((item) =>
    headers.map((header) => {
      const value = item[header];
      if (value === null || value === undefined) return '';
      return typeof value === 'string' ? value : String(value);
    }),
  );
  return { headers, rows };
}

export function finalizeImportTable(table: ParsedTable): ParsedTable {
  if (table.rows.length === 0) throw new Error('Dosyada aktarılacak kelime bulunamadı.');
  if (table.rows.length > IMPORT_MAX_ROWS) {
    throw new Error(`Bir seferde en fazla ${IMPORT_MAX_ROWS} kelime aktarılabilir.`);
  }
  return table;
}

export function parseGridTable(grid: string[][]): ParsedTable {
  if (grid.length < 2) throw new Error('Dosyada bir başlık satırı ve en az bir kelime olmalı.');
  const width = Math.max(...grid.map((row) => row.length));
  const headers = Array.from({ length: width }, (_, index) => (grid[0][index] ?? '').trim());
  const rows = grid.slice(1).map((row) => headers.map((_, index) => (row[index] ?? '').trim()));
  return finalizeImportTable({ headers, rows });
}

export function parseImportFile(text: string, format: 'csv' | 'txt' | 'json'): ParsedTable {
  const clean = text.replace(/^\uFEFF/, '');
  const table = format === 'json' ? parseJsonTable(clean) : format === 'txt' ? parseTxtTable(clean) : parseCsvTable(clean);
  return finalizeImportTable(table);
}

export function guessMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const target of IMPORT_TARGETS) {
    const index = headers.findIndex((header) => target.aliases.includes(normalizeHeader(header)));
    if (index >= 0) mapping[target.key] = index;
  }
  return mapping;
}

export function buildImportPreview(
  table: ParsedTable,
  mapping: ColumnMapping,
  defaults: ImportDefaults,
  categories: Category[],
  existingWords: Word[],
): ImportPreviewRow[] {
  const knownKeys = new Set(existingWords.map((word) => normalizeFinnish(word.finnish)));
  const categoryIdByName = new Map<string, string>(
    categories.map((category) => [category.name.toLocaleLowerCase('tr-TR'), category.id]),
  );

  return table.rows.map((cells, index) => {
    const read = (key: ImportTarget): string => {
      const position = mapping[key];
      return position === undefined ? '' : (cells[position] ?? '').trim();
    };
    const errors: string[] = [];
    const warnings: string[] = [];
    const finnish = read('finnish');
    const turkish = read('turkish');
    if (!finnish) errors.push('Fince kelime boş');
    if (!turkish) errors.push('Türkçe anlamı boş');
    if (finnish.length > MAX_TEXT_LENGTH || turkish.length > MAX_TEXT_LENGTH) {
      errors.push(`Metinler en fazla ${MAX_TEXT_LENGTH} karakter olabilir`);
    }

    const levelText = read('level').toLocaleUpperCase('tr-TR');
    const level = levelText
      ? (LEVEL_OPTIONS.find((option) => option === levelText) ?? null)
      : defaults.level;
    if (levelText && !level) errors.push('Seviye A1-C2 olmalı');
    if (!levelText && !level) errors.push('Dil seviyesi seçilmedi');

    const typeText = read('word_type');
    const wordType = typeText
      ? (WORD_TYPE_OPTIONS.find(
          (option) =>
            option.value === typeText.toLowerCase() ||
            option.label.toLocaleLowerCase('tr-TR') === typeText.toLocaleLowerCase('tr-TR'),
        )?.value ?? null)
      : defaults.wordType;
    if (typeText && !wordType) errors.push('Kelime türü tanınmadı');

    const categoryName = read('category');
    const categoryId = categoryName
      ? (categoryIdByName.get(categoryName.toLocaleLowerCase('tr-TR')) ?? null)
      : null;
    if (categoryName && !categoryId) warnings.push('Kategori bulunamadı, kelime kategorisiz eklenecek');

    const key = normalizeFinnish(finnish);
    let status: ImportRowStatus = 'ready';
    if (errors.length > 0 || !level || !wordType) {
      status = 'invalid';
    } else if (key && knownKeys.has(key)) {
      status = 'duplicate';
    } else {
      knownKeys.add(key);
    }

    const values: WordFormValues | null =
      status === 'invalid' || !level || !wordType
        ? null
        : {
            finnish,
            turkish,
            word_type: wordType,
            level,
            category_id: categoryId,
            image_url: null,
            image_source: null,
            image_credit: null,
            example_fi: read('example_fi') || null,
            example_tr: read('example_tr') || null,
            grammar_note: read('grammar_note') || null,
          };

    return { recordNumber: index + 1, values, status, issues: [...errors, ...warnings] };
  });
}

export function countByStatus(rows: ImportPreviewRow[]): Record<ImportRowStatus, number> {
  return rows.reduce<Record<ImportRowStatus, number>>(
    (counts, row) => ({ ...counts, [row.status]: counts[row.status] + 1 }),
    { ready: 0, duplicate: 0, invalid: 0 },
  );
}
