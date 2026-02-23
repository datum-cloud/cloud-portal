import { cn } from '@shadcn/lib/utils';
import { Textarea as ShadcnTextarea } from '@shadcn/ui/textarea';
import * as React from 'react';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => {
    return (
      <ShadcnTextarea
        ref={ref}
        className={cn(
          'rounded-lg',
          'bg-input-background/50',
          'text-input-foreground',
          'border-input-border',
          'placeholder:text-input-placeholder',
          'focus-visible:ring-0 focus-visible:ring-offset-0',
          'focus-visible:border-input-focus-border',
          'focus-visible:shadow-(--input-focus-shadow)',
          'aria-invalid:border-destructive',
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };
