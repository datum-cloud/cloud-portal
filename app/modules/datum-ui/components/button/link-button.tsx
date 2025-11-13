import { buttonVariants } from './button';
import { cn } from '@shadcn/lib/utils';
import { type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Link, type LinkProps } from 'react-router';

export interface LinkButtonProps
  extends Omit<LinkProps, 'type'>,
    VariantProps<typeof buttonVariants> {
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const LinkButton = React.forwardRef<HTMLAnchorElement, LinkButtonProps>(
  (
    { className, type, theme, size, block, icon, iconPosition = 'left', children, ...props },
    ref
  ) => {
    const isIconOnly = icon && !children;

    const getIconOnlyClass = () => {
      if (!isIconOnly || size === 'icon') return '';
      if (size === 'small') return 'w-8 px-0';
      if (size === 'large') return 'w-11 px-0';
      return 'w-9 px-0';
    };

    return (
      <Link
        className={cn(buttonVariants({ type, theme, size, block }), getIconOnlyClass(), className)}
        ref={ref}
        {...props}>
        {isIconOnly ? (
          icon
        ) : (
          <>
            {icon && iconPosition === 'left' && icon}
            {children}
            {icon && iconPosition === 'right' && icon}
          </>
        )}
      </Link>
    );
  }
);

LinkButton.displayName = 'LinkButton';

export { LinkButton };
