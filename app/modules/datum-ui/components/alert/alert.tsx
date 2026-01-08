import { cn } from '@shadcn/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import { CircleXIcon } from 'lucide-react';
import * as React from 'react';

/**
 * Datum Alert Component
 * Extends shadcn Alert with Datum-specific variants: success, info, warning
 */

// Variant definitions - both classes and close button color in one place
const variantDefinitions = {
  default: {
    classes: 'bg-background text-foreground',
    closeButtonColor: 'text-foreground',
  },
  secondary: {
    classes: 'bg-muted text-primary [&>svg]:text-primary',
    closeButtonColor: 'text-primary',
  },
  outline: {
    classes: 'border-muted text-muted-foreground',
    closeButtonColor: 'text-muted-foreground',
  },
  destructive: {
    classes:
      'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
    closeButtonColor: 'text-destructive',
  },
  success: {
    classes: 'border-success-300 bg-success-100 text-success-500',
    closeButtonColor: 'text-success-500',
  },
  info: {
    classes: 'border-info-300 bg-info-100 text-info-500! [&>svg]:text-info-500',
    closeButtonColor: 'text-info-500',
  },
  warning: {
    classes: 'border-yellow-500 bg-yellow-50 text-yellow-700! [&>svg]:text-yellow-700',
    closeButtonColor: 'text-yellow-700',
  },
} as const;

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
  {
    variants: {
      variant: {
        default: variantDefinitions.default.classes,
        secondary: variantDefinitions.secondary.classes,
        outline: variantDefinitions.outline.classes,
        destructive: variantDefinitions.destructive.classes,
        success: variantDefinitions.success.classes,
        info: variantDefinitions.info.classes,
        warning: variantDefinitions.warning.classes,
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface AlertProps
  extends React.ComponentProps<'div'>, VariantProps<typeof alertVariants> {
  /**
   * Whether the alert can be closed. When true, a close button is displayed.
   * @default false
   */
  closable?: boolean;
  /**
   * Callback function called when the close button is clicked.
   */
  onClose?: () => void;
}

const Alert = ({ className, variant, closable = false, onClose, ...props }: AlertProps) => {
  const [isVisible, setIsVisible] = React.useState(true);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setIsVisible(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), closable && 'pr-10', className)}
      {...props}>
      {props.children}
      {closable && (
        <span
          onClick={handleClose}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClose();
            }
          }}
          className="absolute top-4 right-4 z-10 cursor-pointer opacity-70 transition-opacity hover:opacity-100"
          aria-label="Close alert">
          <CircleXIcon
            className={cn('size-4', variant && variantDefinitions[variant]?.closeButtonColor)}
          />
        </span>
      )}
    </div>
  );
};

const AlertTitle = ({ className, ...props }: React.ComponentProps<'div'>) => {
  return (
    <div
      className={cn('col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight', className)}
      {...props}
    />
  );
};

const AlertDescription = ({ className, ...props }: React.ComponentProps<'div'>) => {
  return (
    <div
      className={cn(
        'text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed',
        className
      )}
      {...props}
    />
  );
};

export { Alert, AlertDescription, AlertTitle };
