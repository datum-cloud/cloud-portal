import { cn } from '@/utils/misc'
import * as React from 'react'

const Input = ({ className, type, ...props }: React.ComponentProps<'input'>) => {
  return (
    <input
      type={type}
      className={cn(
        'border-input bg-background ring-offset-background file:text-foreground flex h-10 w-full rounded-md border px-3 py-2 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'placeholder:text-muted-foreground focus-visible:ring-ring read-only:cursor-not-allowed read-only:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className,
      )}
      data-slot="input"
      {...props}
    />
  )
}
Input.displayName = 'Input'

export { Input }
