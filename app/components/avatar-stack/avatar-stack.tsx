import { getInitials } from '@/utils/helpers/text.helper';
import { Avatar, AvatarFallback, AvatarImage } from '@datum-cloud/datum-ui/avatar';
import { cn } from '@datum-cloud/datum-ui/utils';

export interface AvatarStackItem {
  name: string;
  avatarUrl?: string;
}

export interface AvatarStackProps {
  items: AvatarStackItem[];
  max?: number;
  size?: 'xs' | 'sm';
}

const COLORS = [
  'bg-blue-500',
  'bg-rose-500',
  'bg-amber-600',
  'bg-purple-500',
  'bg-emerald-500',
  'bg-cyan-500',
  'bg-pink-500',
  'bg-indigo-500',
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function AvatarStack({ items, max = 4, size = 'xs' }: AvatarStackProps) {
  if (items.length === 0) return null;

  const visible = items.slice(0, max);
  const overflow = items.length - max;

  const sizeClasses = size === 'xs' ? 'size-6 text-[9px]' : 'size-8 text-[11px]';

  return (
    <div className="flex items-center">
      {visible.map((item, i) => (
        <Avatar
          key={`${item.name}-${i}`}
          className={cn(sizeClasses, 'ring-background ring-2', i > 0 && '-ml-1.5')}
          style={{ zIndex: visible.length - i }}>
          {item.avatarUrl && <AvatarImage src={item.avatarUrl} alt={item.name} />}
          <AvatarFallback
            className={cn(
              sizeClasses,
              'font-bold text-white',
              COLORS[hashName(item.name) % COLORS.length]
            )}>
            {getInitials(item.name)}
          </AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            sizeClasses,
            'bg-muted text-muted-foreground ring-background -ml-1.5 flex items-center justify-center rounded-full font-bold ring-2'
          )}
          style={{ zIndex: 0 }}>
          +{overflow}
        </div>
      )}
    </div>
  );
}
