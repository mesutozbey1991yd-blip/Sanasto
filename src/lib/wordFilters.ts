import { foldForSearch, type Level, type LearningStatus, type Word, type WordType } from '@/lib/vocabulary';

export type LevelSelection = 'all' | Level[];

export interface WordFilters {
  search: string;
  categoryIds: string[];
  levels: LevelSelection;
  wordType: WordType | null;
  status: LearningStatus | null;
  favoritesOnly: boolean;
}

export const EMPTY_WORD_FILTERS: WordFilters = {
  search: '',
  categoryIds: [],
  levels: 'all',
  wordType: null,
  status: null,
  favoritesOnly: false,
};


export function matchesLevels(word: Pick<Word, 'level'>, levels: LevelSelection): boolean {
  return levels === 'all' || levels.includes(word.level);
}

export function matchesCategories(word: Pick<Word, 'category_id'>, categoryIds: string[]): boolean {
  return categoryIds.length === 0 || (word.category_id !== null && categoryIds.includes(word.category_id));
}

export const ALL_LEARNING_STATUSES: LearningStatus[] = ['learned', 'learning', 'not_studied', 'review'];

export interface WordSelectionFilters {
  categoryIds: string[];
  levels: LevelSelection;
  learningStatuses: LearningStatus[];
  favoritesOnly: boolean;
}

export function matchesSelectionFilters(word: Word, filters: WordSelectionFilters): boolean {
  if (!matchesCategories(word, filters.categoryIds)) return false;
  if (!matchesLevels(word, filters.levels)) return false;
  if (filters.favoritesOnly && !word.is_favorite) return false;
  return filters.learningStatuses.includes(word.learning_status);
}

export function filterWords(words: Word[], filters: WordFilters): Word[] {
  const query = foldForSearch(filters.search);
  return words.filter((word) => {
    if (query && !foldForSearch(word.finnish).includes(query) && !foldForSearch(word.turkish).includes(query)) {
      return false;
    }
    if (!matchesCategories(word, filters.categoryIds)) return false;
    if (!matchesLevels(word, filters.levels)) return false;
    if (filters.wordType && word.word_type !== filters.wordType) return false;
    if (filters.status && word.learning_status !== filters.status) return false;
    if (filters.favoritesOnly && !word.is_favorite) return false;
    return true;
  });
}
