import { LogoIcon } from '@/components/logo/logo-icon';
import { Card, CardContent, CardFooter } from '@datum-cloud/datum-ui/card';
import { SpinnerIcon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';

export const WaitingPage = ({ title, className }: { title: string; className?: string }) => {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="grid min-h-[500px]">
        <div className="flex flex-col items-center justify-center gap-6">
          <LogoIcon width={64} className="mb-4" />
          <Text as="p" size="2xl" weight="bold" className="w-full text-center">
            {title}
          </Text>
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
