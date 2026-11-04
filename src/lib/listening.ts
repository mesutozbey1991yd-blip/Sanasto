import type { Word } from '@/lib/vocabulary';
import type { SpeechLanguage } from '@/lib/speech';
import { ALL_LEARNING_STATUSES, matchesSelectionFilters, type WordSelectionFilters } from '@/lib/wordFilters';
import { sortWordsByListMode, WORD_LIST_SORT_OPTIONS, type WordListSort } from '@/lib/wordSort';
import { orderWords } from '@/lib/wordSort';
import { shuffle } from '@/lib/random';
import type { GameSetupConfig } from '@/lib/games/gameConfig';

export type ListeningSort = WordListSort | 'random';

export interface ListeningSource extends WordSelectionFilters {
  sort: ListeningSort;
}

export const LISTENING_SORT_OPTIONS: { value: ListeningSort; label: string }[] = [
  ...WORD_LIST_SORT_OPTIONS,
  { value: 'random', label: 'Karışık' },
];

export const DEFAULT_LISTENING_SOURCE: ListeningSource = {
  categoryIds: [],
  levels: 'all',
  learningStatuses: ALL_LEARNING_STATUSES,
  favoritesOnly: false,
  sort: 'added',
};

export function selectListeningWords(words: Word[], source: ListeningSource): Word[] {
  const filtered = words.filter((word) => matchesSelectionFilters(word, source));
  return source.sort === 'random' ? shuffle(filtered) : sortWordsByListMode(filtered, source.sort);
}

export function selectListeningWordsFromConfig(words: Word[], config: GameSetupConfig): Word[] {
  const filtered = words.filter((word) => matchesSelectionFilters(word, config));
  return orderWords(filtered, config.order, config.alphabetLanguage);
}

export type ListeningOrder = 'fi_tr' | 'tr_fi' | 'fi_only' | 'tr_only';

export const LISTENING_ORDER_OPTIONS: { value: ListeningOrder; label: string; description: string }[] = [
  { value: 'fi_tr', label: 'Önce Fince, sonra Türkçe', description: 'Kelimeyi önce Fince duyarsınız, ardından anlamı.' },
  { value: 'tr_fi', label: 'Önce Türkçe, sonra Fince', description: 'Anlamı duyar, ardından Fince söylenişini dinlersiniz.' },
  { value: 'fi_only', label: 'Yalnızca Fince', description: 'Sadece Fince kelimeler okunur.' },
  { value: 'tr_only', label: 'Yalnızca Türkçe', description: 'Sadece Türkçe anlamlar okunur.' },
];

export const LANGUAGE_GAP_OPTIONS = [0, 1, 2, 3, 5] as const;

export interface ListeningSettings {
  order: ListeningOrder;
  repeatCount: 1 | 2 | 3;
  languageGapSeconds: number;
  pauseSeconds: number;
  autoplay: boolean;
}

export const DEFAULT_LISTENING_SETTINGS: ListeningSettings = {
  order: 'fi_tr',
  repeatCount: 1,
  languageGapSeconds: 0,
  pauseSeconds: 2,
  autoplay: true,
};

export type SpeechStep =
  | { kind: 'speak'; language: SpeechLanguage; text: string }
  | { kind: 'wait'; seconds: number };

export function buildSpeechSteps(word: Word, settings: ListeningSettings): SpeechStep[] {
  const finnishSteps: SpeechStep[] = Array.from({ length: settings.repeatCount }, () => ({
    kind: 'speak' as const,
    language: 'fi' as const,
    text: word.finnish,
  }));
  const turkishSteps: SpeechStep[] = [{ kind: 'speak', language: 'tr', text: word.turkish }];

  switch (settings.order) {
    case 'fi_tr':
      return joinWithGap(finnishSteps, turkishSteps, settings.languageGapSeconds);
    case 'tr_fi':
      return joinWithGap(turkishSteps, finnishSteps, settings.languageGapSeconds);
    case 'fi_only':
      return finnishSteps;
    case 'tr_only':
      return turkishSteps;
  }
}

function joinWithGap(first: SpeechStep[], second: SpeechStep[], gapSeconds: number): SpeechStep[] {
  if (gapSeconds <= 0) return [...first, ...second];
  return [...first, { kind: 'wait', seconds: gapSeconds }, ...second];
}
