import { cn } from '@/utils/misc'
import * as React from 'react'

const Card = ({ className, ...props }: React.ComponentProps<'div'>) => {
  return (
    <div
      data-slot="card"
      className={cn(
        'bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm',
        className,
      )}
      {...props}
    />
  )
}

const CardHeader = ({ className, ...props }: React.ComponentProps<'div'>) => {
  return (
    <div
      data-slot="card-header"
      className={cn('flex flex-col gap-1.5 px-6', className)}
      {...props}
    />
  )
}

const CardTitle = ({ className, ...props }: React.ComponentProps<'div'>) => {
  return (
    <div
      data-slot="card-title"
      className={cn('leading-none font-semibold', className)}
      {...props}
    />
  )
}

const CardDescription = ({ className, ...props }: React.ComponentProps<'div'>) => {
  return (
    <div
      data-slot="card-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

const CardContent = ({ className, ...props }: React.ComponentProps<'div'>) => {
  return <div data-slot="card-content" className={cn('px-6', className)} {...props} />
}

const CardFooter = ({ className, ...props }: React.ComponentProps<'div'>) => {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center px-6', className)}
      {...props}
    />
  )
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
