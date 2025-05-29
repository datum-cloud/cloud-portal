import { cn } from '@/utils/misc';
import * as React from 'react';

export interface InputWithAddonsProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  containerClassName?: string;
}

const InputWithAddons = ({
  leading,
  trailing,
  containerClassName,
  className,
  ...props
}: InputWithAddonsProps) => {
  return (
    <div
      className={cn(
        'group border-input ring-offset-background focus-within:ring-ring flex h-10 w-full overflow-hidden rounded-md border bg-transparent text-sm focus-within:ring-2 focus-within:ring-offset-2 focus-within:outline-hidden',
        containerClassName
      )}>
      {leading ? <div className="flex items-center py-2 pl-3">{leading}</div> : null}
      <input
        className={cn(
          'bg-background placeholder:text-muted-foreground w-full rounded-md px-3 py-2 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        data-slot="input-with-addons"
        {...props}
      />
      {trailing ? <div className="flex items-center py-2 pr-3">{trailing}</div> : null}
    </div>
  );
};
InputWithAddons.displayName = 'InputWithAddons';

export { InputWithAddons };
