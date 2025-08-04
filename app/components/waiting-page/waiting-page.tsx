import { LogoIcon } from '@/components/logo/logo-icon';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/utils/common';
import { Loader2 } from 'lucide-react';

export const WaitingPage = ({ title, className }: { title: string; className?: string }) => {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="grid min-h-[500px]">
        <div className="flex flex-col items-center justify-center gap-6">
          <LogoIcon width={64} className="mb-4" />
          <p className="w-full text-center text-2xl font-bold">{title}</p>
          <Loader2 className="size-10 animate-spin" />
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-center">
        <div className="text-muted-foreground text-center text-balance">
          While you wait, check out the Datum{' '}
          <a
            href="https://docs.datum.net/"
            target="_blank"
            rel="noreferrer"
            className="text-sunglow ml-1 underline">
            Documentation
          </a>
        </div>
      </CardFooter>
    </Card>
  );
};
