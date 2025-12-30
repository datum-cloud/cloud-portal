import { useApp } from '@/providers/app.provider';
import { Button } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Link } from 'react-router';

export interface EmptyContentAction {
  type: 'button' | 'link' | 'external-link';
  label: string;
  onClick?: () => void;
  to?: string;
  variant?: 'default' | 'destructive';
  icon?: React.ReactNode;
  iconPosition?: 'start' | 'end';
}

// Container variants
const containerVariants = cva(
  'flex items-center justify-center relative overflow-hidden bg-[#F4F3F2] dark:bg-transparent',
  {
    variants: {
      variant: {
        default: 'rounded-lg border border-border',
        dashed: 'rounded-lg border border-dashed border-border',
        minimal: '',
      },
      size: {
        xs: 'h-32 p-3',
        sm: 'h-48 p-4',
        md: 'h-[226px] py-7 px-6',
        lg: 'h-80 p-8',
        xl: 'h-96 p-12',
      },
      orientation: {
        vertical: 'flex-col',
        horizontal: 'flex-row',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      orientation: 'vertical',
    },
  }
);

// Title variants
const titleVariants = cva('font-normal text-foreground text-center', {
  variants: {
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-sm',
      lg: 'text-base',
      xl: 'text-lg',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

// Subtitle variants
const subtitleVariants = cva('text-muted-foreground text-center text-xs font-normal', {
  variants: {
    size: {
      xs: 'text-xs',
      sm: 'text-xs',
      md: 'text-xs',
      lg: 'text-sm',
      xl: 'text-base',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

// Actions container variants
const actionsContainerVariants = cva('flex items-center', {
  variants: {
    size: {
      xs: 'gap-1',
      sm: 'gap-1',
      md: 'gap-1.5',
      lg: 'gap-2',
      xl: 'gap-3',
    },
    spacing: {
      compact: '',
      normal: '',
      relaxed: '',
    },
  },
  defaultVariants: {
    size: 'sm',
    spacing: 'normal',
  },
});

// Action button variants
const actionButtonVariants = cva('flex items-center gap-1', {
  variants: {
    size: {
      xs: 'text-xs',
      sm: 'text-xs',
      md: 'text-xs',
      lg: 'text-sm',
      xl: 'text-sm',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

// Size to button size mapping
const BUTTON_SIZE_MAP = {
  xs: 'xs',
  sm: 'xs',
  md: 'xs',
  lg: 'default',
  xl: 'default',
} as const;

export interface EmptyContentProps extends VariantProps<typeof containerVariants> {
  title?: string;
  subtitle?: string;
  className?: string;
  actions?: EmptyContentAction[];
  spacing?: 'compact' | 'normal' | 'relaxed';
}

export const EmptyContent = ({
  title = 'No data found',
  subtitle,
  variant = 'default',
  size = 'md',
  className,
  actions = [],
  orientation = 'vertical',
  spacing = 'normal',
}: EmptyContentProps) => {
  const { user } = useApp();
  const buttonSize = BUTTON_SIZE_MAP[size ?? 'md'];

  const renderAction = (action: EmptyContentAction) => {
    const { icon: actionIcon, iconPosition = 'start' } = action;

    const buttonContent = (
      <Button
        size={buttonSize}
        type={action.variant === 'destructive' ? 'danger' : 'secondary'}
        theme="solid"
        className={actionButtonVariants({ size })}>
        {actionIcon && iconPosition === 'start' && actionIcon}
        <span>{action.label}</span>
        {actionIcon && iconPosition === 'end' && actionIcon}
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
        size={buttonSize}
        onClick={action.onClick}
        type={action.variant === 'destructive' ? 'danger' : 'secondary'}
        theme="solid"
        className={actionButtonVariants({ size })}>
        {actionIcon && iconPosition === 'start' && actionIcon}
        <span>{action.label}</span>
        {actionIcon && iconPosition === 'end' && actionIcon}
      </Button>
    );
  };

  return (
    <div className={cn(containerVariants({ variant, size, orientation }), className)}>
      {/* Decorative corner images */}
      <img
        src={'/images/scene-5.png'}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 h-auto w-1/3 max-w-[230px] select-none"
      />
      <img
        src={'/images/scene-6.png'}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute right-0 bottom-0 h-auto w-1/3 max-w-[200px] select-none"
      />

      <img
        src={'/images/scene-7.png'}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-4 h-auto w-1/3 max-w-[280px] select-none"
      />

      <div className="dark:bg-background border-border relative flex max-w-[224px] flex-col items-center justify-center gap-3.5 rounded-lg border bg-white px-6 py-7">
        <h3 className={titleVariants({ size })}>
          {`Hey ${user?.givenName ?? 'there'}, ${title ? title : ''}`}
        </h3>
        {subtitle && <span className={subtitleVariants({ size })}>{subtitle}</span>}
        {actions.length > 0 && (
          <div className={actionsContainerVariants({ size, spacing })}>
            {actions.map(renderAction)}
          </div>
        )}

        <img
          src={'/images/milo-stamp.svg'}
          alt="Milo"
          aria-hidden="true"
          className="pointer-events-none absolute -top-4 right-2 h-auto w-7 rotate-[7.332deg] select-none"
        />
      </div>
    </div>
  );
};
