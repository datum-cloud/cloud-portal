import { cn } from '@shadcn/lib/utils';

export function Toolbar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('border-input-border flex items-center gap-0.5 border-b px-2 py-1', className)}>
      {children}
    </div>
  );
}

export function ToolbarSeparator() {
  return <div className="bg-input-border mx-1 h-5 w-px" />;
}
