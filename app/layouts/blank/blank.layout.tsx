import { LogoStacked } from '@/components/logo/logo-stacked';
import { cn } from '@/utils/common';

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
        'bg-cream dark:bg-navy relative flex min-h-screen w-full flex-col items-center justify-center',
        className
      )}>
      <LogoStacked height={66} className="mb-12" />
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
