export interface LibraryWord {
  id: string;
  finnish: string;
  turkish: string;
  word_type: string;
  level: string | null;
  level_verified: boolean;
  frequency_rank: number | null;
  frequency_count: number | null;
  has_kotus_validation: boolean;
  source: string;
  license: string;
}

export interface LibraryFilters {
  search: string;
  levels: string[];
  wordTypes: string[];
  onlyWithLevel: boolean;
  onlyKotusValidated: boolean;
  sortBy: 'frequency' | 'alphabetical';
}

export const EMPTY_LIBRARY_FILTERS: LibraryFilters = {
  search: '',
  levels: [],
  wordTypes: [],
  onlyWithLevel: false,
  onlyKotusValidated: false,
  sortBy: 'frequency',
};
