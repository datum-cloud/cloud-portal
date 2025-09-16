import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { IOrganization, OrganizationType } from '@/resources/interfaces/organization.interface';
import { cn } from '@/utils/common';
import { getInitials } from '@/utils/helpers/text.helper';
import { Building2, User } from 'lucide-react';

export interface OrganizationAvatarProps {
  organization: IOrganization;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackClassName?: string;
  showImage?: boolean;
  imageUrl?: string;
}

// Size configurations for different avatar sizes
const SIZE_CONFIG = {
  xs: {
    container: 'size-6',
    icon: 16,
    text: 'text-xs',
  },
  sm: {
    container: 'size-8',
    icon: 18,
    text: 'text-sm',
  },
  md: {
    container: 'size-10',
    icon: 20,
    text: 'text-base',
  },
  lg: {
    container: 'size-12',
    icon: 24,
    text: 'text-lg',
  },
  xl: {
    container: 'size-16',
    icon: 32,
    text: 'text-xl',
  },
} as const;

// Theme configurations for different organization types
const THEME_CONFIG = {
  [OrganizationType.Personal]: {
    background: 'bg-primary',
    text: 'text-primary-foreground',
    icon: User,
  },
  [OrganizationType.Standard]: {
    background: 'bg-orange-500',
    text: 'text-white',
    icon: Building2,
  },
} as const;

export const OrganizationAvatar = ({
  organization,
  size = 'md',
  className,
  fallbackClassName,
  showImage = true,
  imageUrl,
}: OrganizationAvatarProps) => {
  const sizeStyles = SIZE_CONFIG[size];
  const orgType = organization.type || OrganizationType.Standard;
  const themeStyles = THEME_CONFIG[orgType];
  const IconComponent = themeStyles.icon;

  // Get organization display name for initials
  const displayName = organization.displayName || organization.name || '';
  const initials = getInitials(displayName);

  // Determine what to show in the fallback
  const showIcon = orgType === OrganizationType.Personal || !initials;

  return (
    <Avatar
      className={cn(
        sizeStyles.container,
        '!rounded-md', // Override default rounded-full
        className
      )}>
      {/* Avatar Image (if provided and showImage is true) */}
      {showImage && imageUrl && (
        <AvatarImage
          src={imageUrl}
          alt={`${displayName} avatar`}
          className="rounded-md object-cover"
        />
      )}

      {/* Avatar Fallback */}
      <AvatarFallback
        className={cn(
          'rounded-md border-0',
          themeStyles.background,
          themeStyles.text,
          sizeStyles.text,
          fallbackClassName
        )}>
        {showIcon ? (
          <IconComponent size={sizeStyles.icon} />
        ) : (
          <span className="font-semibold select-none">{initials}</span>
        )}
      </AvatarFallback>
    </Avatar>
  );
};

// The OrganizationAvatarProps interface is already exported above
