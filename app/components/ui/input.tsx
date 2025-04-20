import { cn } from '@/utils/misc'
import * as React from 'react'

const Input = ({ className, type, ...props }: React.ComponentProps<'input'>) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md px-3 py-2 text-base md:text-sm',
        // 'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        'border-input bg-background ring-offset-background border',
        'placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden',
        'read-only:cursor-not-allowed read-only:opacity-50 disabled:cursor-not-allowed disabled:opacity-50',
        'file:text-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium',
        className,
      )}
      data-slot="input"
      {...props}
    />
  )
}
Input.displayName = 'Input'

export { Input }
