export type WordType =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'pronoun'
  | 'preposition'
  | 'conjunction'
  | 'numeral'
  | 'interjection'
  | 'phrase'
  | 'other';

export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type LearningStatus = 'not_studied' | 'learning' | 'learned' | 'review';

export type ImageSource =
  | 'upload'
  | 'link'
  | 'ai'
  | 'search'
  | 'twemoji'
  | 'openmoji'
  | 'wikimedia'
  | 'google_ai_mode';

export const WORD_TYPE_OPTIONS: { value: WordType; label: string }[] = [
  { value: 'noun', label: 'İsim' },
  { value: 'verb', label: 'Fiil' },
  { value: 'adjective', label: 'Sıfat' },
  { value: 'adverb', label: 'Zarf' },
  { value: 'pronoun', label: 'Zamir' },
  { value: 'preposition', label: 'Edat' },
  { value: 'conjunction', label: 'Bağlaç' },
  { value: 'numeral', label: 'Sayı' },
  { value: 'interjection', label: 'Ünlem' },
  { value: 'phrase', label: 'Kalıp ifade' },
  { value: 'other', label: 'Diğer' },
];

export const LEVEL_OPTIONS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const LEARNING_STATUS_OPTIONS: { value: LearningStatus; label: string }[] = [
  { value: 'not_studied', label: 'Henüz çalışılmadı' },
  { value: 'learning', label: 'Öğreniliyor' },
  { value: 'learned', label: 'Öğrenildi' },
  { value: 'review', label: 'Tekrar edilmeli' },
];

export const DEFAULT_CATEGORY_NAMES = [
  'Aile ve akrabalar',
  'İnsanlar ve ilişkiler',
  'Vücut',
  'Sağlık',
  'Hastane ve sağlık hizmetleri',
  'Ev',
  'Mutfak',
  'Yiyecekler',
  'İçecekler',
  'Hayvanlar',
  'Bitkiler',
  'Doğa',
  'Hava durumu',
  'Şehir',
  'Ulaşım',
  'Alışveriş',
  'Giyim',
  'İş hayatı',
  'Eğitim',
  'Teknoloji',
  'İletişim',
  'Günlük yaşam',
  'Zaman',
  'Sayılar ve ölçüler',
  'Renkler ve şekiller',
  'Duygular',
  'Hobiler ve boş zaman',
  'Spor',
  'Kültür',
  'Seyahat',
  'Güvenlik',
  'Çevre',
  'Toplum ve hizmetler',
];

export interface Category {
  id: string;
  name: string;
  position: number;
  created_at: string;
}

export interface Word {
  id: string;
  finnish: string;
  turkish: string;
  word_type: WordType;
  level: Level;
  category_id: string | null;
  subcategory_id: string | null;
  image_url: string | null;
  image_source: ImageSource | null;
  image_credit: string | null;
  example_fi: string | null;
  example_tr: string | null;
  grammar_note: string | null;
  is_favorite: boolean;
  learning_status: LearningStatus;
  learning_status_manual: boolean;
  completed_game_types: string[];
  correct_count: number;
  wrong_count: number;
  last_studied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WordFormValues {
  finnish: string;
  turkish: string;
  word_type: WordType;
  level: Level;
  category_id: string | null;
  image_url: string | null;
  image_source: ImageSource | null;
  image_credit: string | null;
  example_fi: string | null;
  example_tr: string | null;
  grammar_note: string | null;
}

export function foldForSearch(text: string): string {
  return text.trim().toLocaleLowerCase('tr-TR');
}

export function normalizeFinnish(text: string): string {
  return text.trim().toLocaleLowerCase('fi-FI');
}

export function getWordTypeLabel(type: WordType): string {
  return WORD_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? 'Diğer';
}
