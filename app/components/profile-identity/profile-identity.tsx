import { getInitials } from '@/utils/helpers/text.helper';
import { cn } from '@shadcn/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@shadcn/ui/avatar';
import { UserRound } from 'lucide-react';

interface ProfileIdentityProps {
  avatarSrc?: string;
  name?: string;
  subtitle?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  fallbackIcon?: React.ComponentType<{ className?: string }>;
  fallbackText?: string;
  avatarOnly?: boolean;
  fallbackClassName?: string;
}

export function ProfileIdentity({
  avatarSrc,
  name,
  subtitle,
  size = 'md',
  className,
  fallbackIcon,
  fallbackText,
  avatarOnly = false,
  fallbackClassName,
}: ProfileIdentityProps) {
  const sizeClasses = {
    xs: {
      avatar: 'size-8',
      name: 'text-xs font-medium',
      subtitle: 'text-xs text-muted-foreground',
      icon: 'size-3',
    },
    sm: {
      avatar: 'size-10',
      name: 'text-sm font-medium',
      subtitle: 'text-xs text-muted-foreground',
      icon: 'size-4',
    },
    md: {
      avatar: 'size-12',
      name: 'text-base font-semibold',
      subtitle: 'text-sm text-muted-foreground',
      icon: 'size-5',
    },
    lg: {
      avatar: 'size-14',
      name: 'text-lg font-semibold',
      subtitle: 'text-base text-muted-foreground',
      icon: 'size-6',
    },
  };

  const FallbackIcon = fallbackIcon || UserRound;

  const renderFallback = () => {
    if (fallbackText) {
      return fallbackText;
    }
    if (name && !fallbackIcon) {
      return getInitials(name);
    }
    return <FallbackIcon className={sizeClasses[size].icon} />;
  };

  if (avatarOnly) {
    return (
      <Avatar className={cn(sizeClasses[size].avatar, 'rounded-xl', className)}>
        <AvatarImage src={avatarSrc} alt={name || 'Avatar'} />
        <AvatarFallback
          className={cn('bg-primary text-primary-foreground rounded-xl', fallbackClassName)}>
          {renderFallback()}
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Avatar className={cn(sizeClasses[size].avatar, 'rounded-xl')}>
        <AvatarImage src={avatarSrc} alt={name || 'Avatar'} />
        <AvatarFallback
          className={cn('bg-primary text-primary-foreground rounded-xl', fallbackClassName)}>
          {renderFallback()}
        </AvatarFallback>
      </Avatar>
      {(name || subtitle) && (
        <div className="flex flex-col">
          {name && <span className={cn(sizeClasses[size].name, 'text-foreground')}>{name}</span>}
          {subtitle && <span className={sizeClasses[size].subtitle}>{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
