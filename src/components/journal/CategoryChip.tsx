import { getContrastTextColor, resolveCategoryColor } from '@/lib/color';
import { cn } from '@/lib/utils';

export type CategoryChipProps = {
  name: string;
  color?: string;
  colors?: Record<string, string> | null;
  className?: string;
};

export function CategoryChip({ name, color, colors, className }: CategoryChipProps) {
  const bg = color ?? resolveCategoryColor(name, colors);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        className,
      )}
      style={{ backgroundColor: bg, color: getContrastTextColor(bg) }}
    >
      {name}
    </span>
  );
}

