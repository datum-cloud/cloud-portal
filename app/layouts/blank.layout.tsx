import { LogoFlat } from '@/components/logo/logo-flat';
import { LogoStacked } from '@/components/logo/logo-stacked';
import { cn } from '@datum-cloud/datum-ui/utils';

export default function BlankLayout({
  children,
  className,
  logo = 'stacked',
  showSceneImages = true,
}: {
  children: React.ReactNode;
  className?: string;
  /** Stacked logo centered above content (default), or flat wordmark (centered above content on small screens, top-left on md+). */
  logo?: 'stacked' | 'flat';
  showSceneImages?: boolean;
}) {
  return (
    <div
      className={cn(
        'bg-background relative flex min-h-svh w-full flex-col items-center p-3 sm:p-4 md:p-6 lg:p-12 xl:p-[90px]',
        className
      )}>
      {logo === 'flat' ? (
        <>
          <LogoFlat
            className="absolute top-8 left-[41px] z-10 hidden h-6 w-auto md:block"
            aria-label="Datum"
          />
          <div className="z-10 flex w-full flex-1 flex-col items-center justify-center">
            <LogoFlat className="mb-8 h-6 w-auto shrink-0 md:hidden" aria-label="Datum" />
            {children}
          </div>
        </>
      ) : (
        <>
          <LogoStacked className="mb-12" />
          {children}
        </>
      )}

      {showSceneImages && (
        <>
          <div className="absolute bottom-0 left-0 z-0 max-w-[300px] md:max-w-[416px]">
            <img src="/images/scene-1.png" className="size-auto w-full object-cover" />
          </div>

          <div className="absolute right-0 bottom-0 z-0 max-w-[500px] md:max-w-[800px]">
            <img src="/images/scene-2.png" className="size-auto w-full object-cover" />
          </div>
        </>
      )}
    </div>
  );
}
