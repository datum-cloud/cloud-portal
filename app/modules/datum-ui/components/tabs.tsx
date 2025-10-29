import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@shadcn/lib/utils';
import * as React from 'react';
import { Link } from 'react-router';

/**
 * Datum Tabs Component
 * Extends shadcn Tabs with:
 * - TabsLinkTrigger for react-router integration
 * - Dark mode customizations
 */

const Tabs = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) => {
  return <TabsPrimitive.Root className={cn('flex flex-col gap-2', className)} {...props} />;
};

const TabsList = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) => {
  return (
    <TabsPrimitive.List
      className={cn(
        'bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-1',
        className
      )}
      {...props}
    />
  );
};

const TabsTrigger = ({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) => {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "data-[state=active]:bg-background dark:data-[state=active]:text-cream data-[state=active]:text-foreground dark:hover:text-cream focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
};

const TabsContent = ({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) => {
  return <TabsPrimitive.Content className={cn('flex-1 outline-none', className)} {...props} />;
};

const TabsLinkTrigger = ({
  value,
  to,
  children,
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> & {
  to: string;
}) => {
  return (
    <TabsTrigger value={value} asChild className={className} {...props}>
      <Link to={to}>{children}</Link>
    </TabsTrigger>
  );
};

export { Tabs, TabsList, TabsTrigger, TabsContent, TabsLinkTrigger };
