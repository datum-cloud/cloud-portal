import { LogoStacked } from '@/components/logo/logo-stacked';
import { cn } from '@shadcn/lib/utils';

export default function BlankLayout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-background relative flex min-h-screen w-full flex-col items-center p-3 sm:p-4 md:p-6 lg:p-12 xl:p-[90px]',
        className
      )}>
      <LogoStacked className="mb-12" />
      {children}

      <div className="absolute bottom-0 left-0 z-0 max-w-[300px] md:max-w-[416px]">
        <img src="/images/scene-1.png" className="size-auto w-full object-cover" />
      </div>

      <div className="absolute right-0 bottom-0 z-0 max-w-[500px] md:max-w-[800px]">
        <img src="/images/scene-2.png" className="size-auto w-full object-cover" />
      </div>
    </div>
  );
}
