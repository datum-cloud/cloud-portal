import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardHeader } from '@datum-cloud/datum-ui/card';
import { SpinnerIcon } from '@datum-cloud/datum-ui/icons';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { cn } from '@datum-cloud/datum-ui/utils';
import { ArrowRightIcon, CheckIcon } from 'lucide-react';
import type { ReactNode } from 'react';

const ActionCard = ({
  image,
  title,
  onClick,
  buttonLabel,
  isCompleted,
  isLoading,
  className,
}: {
  image: ReactNode;
  title: string;
  onClick?: () => void;
  buttonLabel?: string;
  isCompleted?: boolean;
  isLoading?: boolean;
  className?: string;
}) => {
  return (
    <Card
      className={cn(
        'h-full w-full gap-0 rounded-lg bg-white p-0 shadow dark:bg-[#18273A]',
        isCompleted && !isLoading && 'dark:border-card-tertiary border-primary/40',
        isLoading && 'opacity-95',
        className
      )}>
      <CardHeader
        className={cn(
          'bg-card-tertiary relative flex h-[170px] items-center justify-center gap-6 rounded-t-lg p-8',
          isCompleted && 'dark:bg-card bg-background',
          isLoading && 'dark:bg-card bg-background'
        )}>
        {isLoading ? (
          <Skeleton className="h-[80px] w-[120px] rounded-lg" />
        ) : typeof image === 'string' ? (
          <img
            src={image}
            alt={title}
            className="h-auto max-h-[80px] min-h-[60px] w-auto object-contain"
          />
        ) : (
          image
        )}

        {isCompleted && !isLoading && (
          <Icon
            icon={CheckIcon}
            className="text-primary absolute top-2.5 right-2.5"
            size={16}
            strokeWidth={1.3}
          />
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center justify-between gap-4 p-8">
        {isLoading ? (
          <Skeleton className="h-6 w-32 rounded" />
        ) : (
          <span className="dark:text-card-foreground text-foreground text-center text-base font-semibold">
            {title}
          </span>
        )}

        {isLoading ? (
          <Button
            type={isCompleted ? 'quaternary' : 'primary'}
            theme="outline"
            size="xs"
            disabled
            className={cn(
              isCompleted &&
                'dark:border-card-foreground dark:hover:bg-card-foreground dark:hover:text-card dark:text-card-foreground text-foreground border-foreground hover:border-foreground hover:bg-foreground hover:text-background',
              !isCompleted && 'size-10 rounded-full'
            )}
            icon={<SpinnerIcon size="sm" aria-hidden />}>
            {isCompleted ? buttonLabel : null}
          </Button>
        ) : isCompleted ? (
          <Button
            type="quaternary"
            theme="outline"
            size="xs"
            onClick={onClick}
            className="dark:border-card-foreground dark:hover:bg-card-foreground dark:hover:text-card dark:text-card-foreground text-foreground border-foreground hover:border-foreground hover:bg-foreground hover:text-background">
            {buttonLabel}
          </Button>
        ) : (
          <Button
            type="primary"
            theme="outline"
            size="xs"
            onClick={onClick}
            className="size-10 rounded-full"
            icon={<Icon icon={ArrowRightIcon} size={24} strokeWidth={1} />}
            aria-label={`Set up ${title}`}
          />
        )}
      </CardContent>
    </Card>
  );
};

export { ActionCard };
