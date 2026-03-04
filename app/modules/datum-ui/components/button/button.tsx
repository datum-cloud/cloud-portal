import { SpinnerIcon } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50',
  {
    variants: {
      type: {
        primary: '',
        secondary: '',
        tertiary: '',
        quaternary: '',
        warning: '',
        danger: '',
        success: '',
      },
      theme: {
        solid: '',
        light: '',
        outline: 'border',
        borderless: 'border-0 bg-transparent',
        link: 'text-primary underline-offset-2 underline hover:opacity-80',
      },
      size: {
        xs: 'h-7 px-2.5 text-xs',
        small: 'h-9 px-3 text-xs',
        default: 'h-9 px-4 py-2',
        large: 'h-11 px-8 text-base',
        icon: 'h-9 w-9',
        link: 'px-0 py-0',
      },
      block: {
        true: 'w-full',
        false: '',
      },
    },
    compoundVariants: [
      // Primary button variants
      {
        type: 'primary',
        theme: 'solid',
        className:
          'bg-btn-primary border border-btn-primary-border text-btn-primary-foreground hover:bg-btn-primary-hover active:bg-btn-primary-active disabled:bg-btn-primary/60',
      },
      {
        type: 'primary',
        theme: 'light',
        className: cn(
          'bg-btn-neutral-bg text-primary hover:bg-btn-neutral-bg-hover active:bg-btn-neutral-bg-active disabled:bg-btn-neutral-bg disabled:text-primary',
          'dark:text-foreground'
        ),
      },
      {
        type: 'primary',
        theme: 'outline',
        className: cn(
          'border border-btn-primary-border/60 text-primary hover:border-btn-primary-border active:border-btn-primary-border disabled:bg-transparent disabled:text-primary disabled:border-btn-primary-border/60',
          'dark:text-foreground dark:border-foreground/60 dark:hover:border-foreground dark:active:border-foreground/80'
        ),
      },
      {
        type: 'primary',
        theme: 'borderless',
        className: cn(
          'text-primary hover:bg-btn-neutral-bg active:bg-btn-neutral-bg-active disabled:bg-transparent disabled:text-primary',
          'dark:text-foreground'
        ),
      },

      // Secondary button variants
      {
        type: 'secondary',
        theme: 'solid',
        className:
          'bg-btn-secondary border border-btn-secondary-border text-btn-secondary-foreground hover:bg-btn-secondary-hover active:bg-btn-secondary-active disabled:bg-btn-secondary/60',
      },
      {
        type: 'secondary',
        theme: 'light',
        className: cn(
          'bg-btn-neutral-bg text-secondary hover:bg-btn-neutral-bg-hover active:bg-btn-neutral-bg-active disabled:bg-btn-neutral-bg disabled:text-secondary',
          'dark:text-foreground'
        ),
      },
      {
        type: 'secondary',
        theme: 'outline',
        className: cn(
          'border border-btn-secondary-border/60 text-secondary hover:border-btn-secondary-border active:border-btn-secondary-border disabled:bg-transparent disabled:text-secondary disabled:border-btn-secondary-border/60',
          'dark:text-foreground dark:border-foreground/60 dark:hover:border-foreground dark:active:border-foreground/80'
        ),
      },
      {
        type: 'secondary',
        theme: 'borderless',
        className: cn(
          'text-secondary hover:bg-btn-neutral-bg active:bg-btn-neutral-bg-active disabled:bg-transparent disabled:text-secondary',
          'dark:text-foreground'
        ),
      },

      // Tertiary button variants
      {
        type: 'tertiary',
        theme: 'solid',
        className:
          'bg-btn-tertiary border border-btn-tertiary-border text-btn-tertiary-foreground hover:bg-btn-tertiary-hover active:bg-btn-tertiary-active disabled:bg-btn-tertiary/60',
      },
      {
        type: 'tertiary',
        theme: 'light',
        className: cn(
          'bg-btn-neutral-bg text-tertiary hover:bg-btn-neutral-bg-hover active:bg-btn-neutral-bg-active disabled:bg-btn-neutral-bg disabled:text-tertiary',
          'dark:text-foreground'
        ),
      },
      {
        type: 'tertiary',
        theme: 'outline',
        className: cn(
          'border border-btn-tertiary-border/60 text-tertiary hover:border-btn-tertiary-border active:border-btn-tertiary-border disabled:bg-transparent disabled:text-tertiary disabled:border-btn-tertiary-border/60',
          'dark:text-foreground dark:border-foreground/60 dark:hover:border-foreground dark:active:border-foreground/80'
        ),
      },
      {
        type: 'tertiary',
        theme: 'borderless',
        className: cn(
          'text-tertiary hover:bg-btn-neutral-bg active:bg-btn-neutral-bg-active disabled:bg-transparent disabled:text-tertiary',
          'dark:text-foreground'
        ),
      },

      // Quaternary button variants
      {
        type: 'quaternary',
        theme: 'solid',
        className:
          'bg-btn-quaternary border border-btn-quaternary text-btn-quaternary-foreground hover:bg-btn-quaternary-hover active:bg-btn-quaternary-active disabled:bg-btn-quaternary/60',
      },
      {
        type: 'quaternary',
        theme: 'light',
        className: cn(
          'bg-btn-neutral-bg text-btn-quaternary-foreground hover:bg-btn-neutral-bg-hover active:bg-btn-neutral-bg-active disabled:bg-btn-neutral-bg disabled:text-btn-quaternary-foreground',
          'dark:text-foreground'
        ),
      },
      {
        type: 'quaternary',
        theme: 'outline',
        className: cn(
          'border border-btn-quaternary-border/60 text-btn-quaternary-foreground hover:border-btn-quaternary-border active:border-btn-quaternary-border disabled:bg-transparent disabled:text-btn-quaternary-foreground disabled:border-btn-quaternary-border/60',
          'dark:text-foreground dark:border-foreground/60 dark:hover:border-foreground dark:active:border-foreground/80'
        ),
      },
      {
        type: 'quaternary',
        theme: 'borderless',
        className: cn(
          'text-btn-quaternary-foreground hover:bg-btn-neutral-bg active:bg-btn-neutral-bg-active disabled:bg-transparent disabled:text-btn-quaternary-foreground',
          'dark:text-foreground'
        ),
      },

      // Warning button variants
      {
        type: 'warning',
        theme: 'solid',
        className:
          'bg-btn-warning text-btn-warning-foreground border border-btn-warning-border hover:bg-btn-warning-hover active:bg-btn-warning-active disabled:bg-btn-warning/60',
      },
      {
        type: 'warning',
        theme: 'light',
        className:
          'bg-btn-neutral-bg text-btn-warning hover:bg-btn-neutral-bg-hover active:bg-btn-neutral-bg-active disabled:bg-btn-neutral-bg disabled:text-btn-warning',
      },
      {
        type: 'warning',
        theme: 'outline',
        className:
          'border-yellow-600 text-yellow-600 hover:bg-yellow-600 hover:text-white active:bg-yellow-700 active:text-white dark:border-yellow-500 dark:text-yellow-500 dark:hover:bg-yellow-500 dark:hover:text-white dark:active:bg-yellow-600 dark:active:text-white disabled:bg-transparent disabled:text-yellow-600 disabled:border-yellow-600 disabled:hover:bg-transparent disabled:hover:text-yellow-600',
      },
      {
        type: 'warning',
        theme: 'borderless',
        className:
          'text-btn-warning hover:bg-btn-neutral-bg active:bg-btn-neutral-bg-active disabled:bg-transparent disabled:text-btn-warning',
      },

      // Danger button variants
      {
        type: 'danger',
        theme: 'solid',
        className:
          'bg-btn-danger text-btn-danger-foreground border border-btn-danger-border hover:bg-btn-danger-hover active:bg-btn-danger-active disabled:bg-btn-danger/60',
      },
      {
        type: 'danger',
        theme: 'light',
        className:
          'bg-btn-neutral-bg text-btn-danger hover:bg-btn-neutral-bg-hover active:bg-btn-neutral-bg-active disabled:bg-btn-neutral-bg disabled:text-btn-danger',
      },
      {
        type: 'danger',
        theme: 'outline',
        className:
          'border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground active:bg-destructive/90 active:text-destructive-foreground disabled:bg-transparent disabled:text-destructive disabled:border-destructive disabled:hover:bg-transparent disabled:hover:text-destructive',
      },
      {
        type: 'danger',
        theme: 'borderless',
        className:
          'text-btn-danger hover:bg-btn-neutral-bg active:bg-btn-neutral-bg-active disabled:bg-transparent disabled:text-btn-danger',
      },

      // Success button variants
      {
        type: 'success',
        theme: 'solid',
        className:
          'bg-btn-success text-btn-success-foreground border border-btn-success-border hover:bg-btn-success-hover active:bg-btn-success-active disabled:bg-btn-success/60',
      },
      {
        type: 'success',
        theme: 'light',
        className:
          'bg-btn-neutral-bg text-btn-success hover:bg-btn-neutral-bg-hover active:bg-btn-neutral-bg-active disabled:bg-btn-neutral-bg disabled:text-btn-success',
      },
      {
        type: 'success',
        theme: 'outline',
        className:
          'border-green-600 text-green-600 hover:bg-green-600 hover:text-white active:bg-green-700 active:text-white dark:border-green-500 dark:text-green-500 dark:hover:bg-green-500 dark:hover:text-white dark:active:bg-green-600 dark:active:text-white disabled:bg-transparent disabled:text-green-600 disabled:border-green-600 disabled:hover:bg-transparent disabled:hover:text-green-600',
      },
      {
        type: 'success',
        theme: 'borderless',
        className:
          'text-btn-success hover:bg-btn-neutral-bg active:bg-btn-neutral-bg-active disabled:bg-transparent disabled:text-btn-success',
      },
    ],
    defaultVariants: {
      type: 'primary',
      theme: 'solid',
      size: 'default',
      block: false,
    },
  }
);

export interface ButtonProps
  extends
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loadingIcon?: React.ReactNode;
  htmlType?: 'button' | 'submit' | 'reset';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      type,
      theme,
      size,
      block,
      loading = false,
      disabled,
      icon,
      iconPosition = 'left',
      loadingIcon,
      htmlType = 'button',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    // Auto-detect icon-only buttons and adjust to square
    const isIconOnly = (icon || loading) && !children;

    // For icon-only buttons, replace icon with loading spinner when loading
    const showIcon = !loading && icon;
    const getLoadingIcon = () => {
      return (
        loadingIcon || (
          <SpinnerIcon
            size={size === 'small' ? 'xs' : size === 'large' ? 'sm' : 'md'}
            aria-hidden="true"
          />
        )
      );
    };
    const showLoadingIcon =
      loading && (isIconOnly ? getLoadingIcon() : <SpinnerIcon size="sm" aria-hidden="true" />);

    const getIconOnlyClass = () => {
      if (!isIconOnly || size === 'icon') return '';
      if (size === 'small') return 'w-8 px-0';
      if (size === 'large') return 'w-11 px-0';
      return 'w-9 px-0'; // default
    };

    return (
      <button
        className={cn(buttonVariants({ type, theme, size, block }), getIconOnlyClass(), className)}
        ref={ref}
        disabled={isDisabled}
        type={htmlType}
        {...props}>
        {/* For icon-only buttons: show loading OR icon, not both */}
        {isIconOnly ? (
          loading ? (
            showLoadingIcon
          ) : (
            showIcon && icon
          )
        ) : (
          <>
            {showLoadingIcon && showLoadingIcon}
            {showIcon && iconPosition === 'left' && icon}
            {children}
            {showIcon && iconPosition === 'right' && icon}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
