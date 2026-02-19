import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@shadcn/lib/utils';
import * as React from 'react';

/**
 * Datum Tabs Component
 * Extends shadcn Tabs with:
 * - TabsLinkTrigger for router-agnostic link integration
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
        "data-[state=active]:bg-background dark:data-[state=active]:text-foreground data-[state=active]:text-foreground dark:hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
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

interface TabsLinkTriggerProps extends React.ComponentProps<typeof TabsPrimitive.Trigger> {
  /** Destination URL — mapped to `href` for native `<a>`, `to` for router Links */
  href: string;
  /** Link component to use (defaults to native `<a>`) */
  linkComponent?: React.ElementType;
}

const TabsLinkTrigger = ({
  value,
  href,
  linkComponent: LinkComp = 'a',
  children,
  className,
  ...props
}: TabsLinkTriggerProps) => {
  // Map href to the appropriate prop for the component
  const linkProps = LinkComp === 'a' ? { href } : { to: href };

  return (
    <TabsTrigger value={value} asChild className={className} {...props}>
      <LinkComp {...linkProps}>{children}</LinkComp>
    </TabsTrigger>
  );
};

export { Tabs, TabsList, TabsTrigger, TabsContent, TabsLinkTrigger };
export type { TabsLinkTriggerProps };
