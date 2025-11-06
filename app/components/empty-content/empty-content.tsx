import { Button } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { Link } from 'react-router';

export interface EmptyContentAction {
  type: 'button' | 'link' | 'external-link';
  label: string;
  onClick?: () => void;
  to?: string;
  variant?: 'default' | 'destructive';
  icon?: React.ReactNode;
}

export interface EmptyContentProps {
  // Content
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  image?: string;

  // Layout & Styling
  variant?: 'default' | 'dashed' | 'minimal' | 'centered';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;

  // Actions
  actions?: EmptyContentAction[];

  // Layout options
  orientation?: 'vertical' | 'horizontal';
  spacing?: 'compact' | 'normal' | 'relaxed';
}

// Base styles that are consistent across variants
const BASE_STYLES = {
  container: 'flex items-center justify-center relative overflow-hidden',
  content: 'flex flex-col items-center text-center relative z-10',
  titleContainer: 'flex flex-col items-center',
  title: 'font-semibold text-foreground',
  subtitle: 'text-muted-foreground',
  actionsContainer: 'flex items-center',
  button: 'flex items-center gap-1',
} as const;

// Variant-specific styles
const VARIANT_STYLES = {
  default: {
    container: 'rounded-lg border-2 border-border bg-white dark:bg-transparent',
    content: '',
  },
  dashed: {
    container: 'rounded-lg border-2 border-dashed border-border bg-white dark:bg-transparent',
    content: '',
  },
  minimal: {
    container: 'bg-white dark:bg-transparent',
    content: '',
  },
  centered: {
    container: 'bg-white dark:bg-transparent',
    content: '',
  },
} as const;

// Size configurations - comprehensive sizing system
const SIZE_CONFIG = {
  xs: {
    container: 'h-32 p-3',
    content: 'gap-1.5',
    icon: 'size-6',
    image: 'size-16',
    title: 'text-sm',
    subtitle: 'text-xs',
    titleGap: 'mb-1',
    actionsGap: 'gap-1',
    actionsMargin: 'mt-2',
    buttonSize: 'sm' as const,
  },
  sm: {
    container: 'h-48 p-4',
    content: 'gap-2',
    icon: 'size-8',
    image: 'size-24',
    title: 'text-base',
    subtitle: 'text-sm',
    titleGap: 'mb-1.5',
    actionsGap: 'gap-1.5',
    actionsMargin: 'mt-3',
    buttonSize: 'sm' as const,
  },
  md: {
    container: 'h-64 p-6',
    content: 'gap-3',
    icon: 'size-10',
    image: 'size-32',
    title: 'text-lg',
    subtitle: 'text-sm',
    titleGap: 'mb-2',
    actionsGap: 'gap-2',
    actionsMargin: 'mt-4',
    buttonSize: 'sm' as const,
  },
  lg: {
    container: 'h-80 p-8',
    content: 'gap-4',
    icon: 'size-12',
    image: 'size-40',
    title: 'text-xl',
    subtitle: 'text-base',
    titleGap: 'mb-3',
    actionsGap: 'gap-3',
    actionsMargin: 'mt-6',
    buttonSize: 'default' as const,
  },
  xl: {
    container: 'h-96 p-12',
    content: 'gap-6',
    icon: 'size-16',
    image: 'size-48',
    title: 'text-2xl',
    subtitle: 'text-lg',
    titleGap: 'mb-4',
    actionsGap: 'gap-4',
    actionsMargin: 'mt-8',
    buttonSize: 'default' as const,
  },
} as const;

// Spacing configurations
const SPACING_CONFIG = {
  compact: {
    content: 'gap-1',
    titleGap: 'mb-0.5',
    actionsMargin: 'mt-1.5',
  },
  normal: {
    content: '', // Uses size-based defaults
    titleGap: '', // Uses size-based defaults
    actionsMargin: '', // Uses size-based defaults
  },
  relaxed: {
    content: 'gap-6',
    titleGap: 'mb-4',
    actionsMargin: 'mt-8',
  },
} as const;

// Orientation configurations
const ORIENTATION_CONFIG = {
  vertical: {
    container: 'flex-col',
    content: 'flex-col',
  },
  horizontal: {
    container: 'flex-row',
    content: 'flex-row items-center text-left',
  },
} as const;

export const EmptyContent = ({
  title = 'No data found',
  subtitle = 'There is no data to display.',
  icon,
  image,
  variant = 'default',
  size = 'md',
  className,
  actions = [],
  orientation = 'vertical',
  spacing = 'normal',
}: EmptyContentProps) => {
  const sizeStyles = SIZE_CONFIG[size];
  const variantStyles = VARIANT_STYLES[variant];
  const spacingStyles = SPACING_CONFIG[spacing];
  const orientationStyles = ORIENTATION_CONFIG[orientation];

  const renderIcon = () => {
    if (image) {
      return <img src={image} alt="" className={cn(sizeStyles.image, 'object-contain')} />;
    }

    if (icon) {
      return <div className={cn(sizeStyles.icon, 'text-muted-foreground')}>{icon}</div>;
    }

    return null;
  };

  const renderAction = (action: EmptyContentAction) => {
    const buttonContent = (
      <Button
        size={sizeStyles.buttonSize === 'default' ? 'default' : 'small'}
        type={action.variant === 'destructive' ? 'danger' : 'tertiary'}
        theme="solid"
        className={cn(BASE_STYLES.button, sizeStyles.subtitle)}>
        {action.icon}
        <span>{action.label}</span>
      </Button>
    );

    if (action.type === 'link' || action.type === 'external-link') {
      return (
        <Link
          key={action.label}
          to={action.to ?? ''}
          target={action.type === 'external-link' ? '_blank' : '_self'}
          rel={action.type === 'external-link' ? 'noopener noreferrer' : undefined}>
          {buttonContent}
        </Link>
      );
    }

    return (
      <Button
        key={action.label}
        size={sizeStyles.buttonSize === 'default' ? 'default' : 'small'}
        onClick={action.onClick}
        type={action.variant === 'destructive' ? 'danger' : 'tertiary'}
        theme="solid"
        className={cn(BASE_STYLES.button, sizeStyles.subtitle)}>
        {action.icon}
        <span>{action.label}</span>
      </Button>
    );
  };

  return (
    <div
      className={cn(
        BASE_STYLES.container,
        orientationStyles.container,
        variantStyles.container,
        sizeStyles.container,
        className
      )}>
      {/* Decorative corner images */}
      <img
        src={'/images/scene-2.png'}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 h-auto w-1/3 max-w-96 -scale-x-100 select-none"
      />
      <img
        src={'/images/scene-1.png'}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute right-0 bottom-0 h-auto w-1/3 max-w-48 -scale-x-100 select-none"
      />

      <div
        className={cn(
          BASE_STYLES.content,
          orientationStyles.content,
          variantStyles.content,
          spacingStyles.content || sizeStyles.content
        )}>
        {/* Icon/Image */}
        {renderIcon()}

        {/* Title and Subtitle */}
        <div
          className={cn(BASE_STYLES.titleContainer, spacingStyles.titleGap || sizeStyles.titleGap)}>
          {title && <h2 className={cn(BASE_STYLES.title, sizeStyles.title)}>{title}</h2>}
          {subtitle && <p className={cn(BASE_STYLES.subtitle, sizeStyles.subtitle)}>{subtitle}</p>}
        </div>

        {/* Actions */}
        {actions.length > 0 && (
          <div
            className={cn(
              BASE_STYLES.actionsContainer,
              sizeStyles.actionsGap,
              spacingStyles.actionsMargin || sizeStyles.actionsMargin
            )}>
            {actions.map(renderAction)}
          </div>
        )}
      </div>
    </div>
  );
};
