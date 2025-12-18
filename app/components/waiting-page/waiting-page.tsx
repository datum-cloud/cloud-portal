import { LogoIcon } from '@/components/logo/logo-icon';
import { Card, CardContent, CardFooter, SpinnerIcon } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';

export const WaitingPage = ({ title, className }: { title: string; className?: string }) => {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="grid min-h-[500px]">
        <div className="flex flex-col items-center justify-center gap-6">
          <LogoIcon width={64} className="mb-4" />
          <p className="w-full text-center text-2xl font-bold">{title}</p>
          <SpinnerIcon size="xl" aria-hidden="true" />
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-center">
        <div className="text-muted-foreground text-center text-balance">
          While you wait, check out the Datum{' '}
          <a
            href="https://datum.net/docs/"
            target="_blank"
            rel="noreferrer"
            className="text-primary ml-1 underline">
            Documentation
          </a>
        </div>
      </CardFooter>
    </Card>
  );
};
