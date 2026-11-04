import MultiSelectField from '@/components/MultiSelectField';
import { LEVEL_OPTIONS } from '@/lib/vocabulary';
import type { LevelSelection } from '@/lib/wordFilters';

interface LevelSelectorProps {
  value: LevelSelection;
  onChange: (value: LevelSelection) => void;
}

const LEVEL_FIELD_OPTIONS = LEVEL_OPTIONS.map((level) => ({ value: level, label: level }));

export default function LevelSelector({ value, onChange }: LevelSelectorProps) {
  return (
    <MultiSelectField
      label="Seviye"
      options={LEVEL_FIELD_OPTIONS}
      selected={value === 'all' ? [] : value}
      allLabel="Tüm seviyeler"
      onChange={(levels) => onChange(levels.length === 0 ? 'all' : LEVEL_OPTIONS.filter((level) => levels.includes(level)))}
    />
  );
}
