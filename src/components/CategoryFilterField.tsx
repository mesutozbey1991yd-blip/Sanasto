import MultiSelectField from '@/components/MultiSelectField';
import LearningBattery from '@/components/LearningBattery';
import type { Category, Word } from '@/lib/vocabulary';
import { getCategoryOptions, getSelectionProgress } from '@/lib/learningProgress';

interface CategoryFilterFieldProps {
  label: string;
  categories: Category[];
  words: Word[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export default function CategoryFilterField({ label, categories, words, selected, onChange }: CategoryFilterFieldProps) {
  const options = getCategoryOptions(categories, words);
  const progress = getSelectionProgress(words, selected);
  const caption =
    selected.length === 0
      ? 'Tüm kelimeler'
      : selected.length === 1
        ? options.find((option) => option.value === selected[0])?.label ?? ''
        : `${selected.length} kategori seçili`;

  return (
    <div className="space-y-2">
      <MultiSelectField
        label={label}
        options={options}
        selected={selected}
        allLabel="Tüm kategoriler"
        onChange={onChange}
      />
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{caption}</p>
        <LearningBattery progress={progress} />
      </div>
    </div>
  );
}
