import { cn } from '@shadcn/lib/utils';
import * as React from 'react';

export interface InputWithAddonsProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  containerClassName?: string;
}

const InputWithAddons = React.forwardRef<HTMLInputElement, InputWithAddonsProps>(
  ({ leading, trailing, containerClassName, className, ...props }, ref) => {
    return (
      <div
        className={cn(
          'border-input-border bg-input-background/50 text-input-foreground placeholder:text-input-placeholder',
          'focus-within:border-input-focus-border focus-within:shadow-(--input-focus-shadow)',
          'group flex h-10 w-full items-stretch overflow-hidden rounded-lg border transition-all',
          'focus-within:ring-0 focus-within:ring-offset-0 focus-within:outline-hidden',

          containerClassName
        )}>
        {leading ? (
          <div className="text-muted-foreground flex items-center bg-transparent pl-3">
            {leading}
          </div>
        ) : null}
        <input
          className={cn(
            'flex-1 bg-transparent px-3 text-base md:text-sm',
            'placeholder:text-input-placeholder text-input-foreground',
            'focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-hidden',
            'focus-visible:border-transparent focus-visible:shadow-none',
            'read-only:cursor-not-allowed read-only:opacity-50 disabled:cursor-not-allowed disabled:opacity-50',
            'file:text-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium',
            leading && 'pl-2',
            trailing && 'pr-2',
            className
          )}
          data-slot="input-with-addons"
          ref={ref}
          {...props}
        />
        {trailing ? (
          <div className="text-muted-foreground flex items-center bg-transparent pr-3">
            {trailing}
          </div>
        ) : null}
      </div>
    );
  }
);
InputWithAddons.displayName = 'InputWithAddons';

export { InputWithAddons };
