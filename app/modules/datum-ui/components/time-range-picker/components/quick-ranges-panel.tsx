// app/modules/datum-ui/components/time-range-picker/components/quick-ranges-panel.tsx
import type { PresetConfig, TimeRangeValue } from '../types';
import { cn } from '@shadcn/lib/utils';

interface QuickRangesPanelProps {
  presets: PresetConfig[];
  value: TimeRangeValue | null;
  onPresetSelect: (preset: PresetConfig) => void;
  className?: string;
}

export function QuickRangesPanel({
  presets,
  value,
  onPresetSelect,
  className,
}: QuickRangesPanelProps) {
  const selectedPreset = value?.type === 'preset' ? value.preset : undefined;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <p className="text-muted-foreground px-3 text-xs font-medium">Presets</p>
      <div className="grid gap-1">
        {presets.map((preset) => {
          const isSelected = selectedPreset === preset.key;
          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => onPresetSelect(preset)}
              className={cn(
                'flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                isSelected
                  ? 'bg-accent text-primary border-border border font-medium'
                  : 'border border-transparent'
              )}>
              <span>{preset.label}</span>
              <kbd
                className={cn(
                  'bg-muted pointer-events-none hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium select-none sm:flex',
                  isSelected ? 'border-primary' : 'bg-muted/50 border-transparent'
                )}>
                {preset.shortcut}
              </kbd>
            </button>
          );
        })}
      </div>
    </div>
  );
}
