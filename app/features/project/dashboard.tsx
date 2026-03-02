import { Button, Card, CardContent, CardHeader } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { cn } from '@shadcn/lib/utils';
import { ArrowRightIcon, CheckIcon } from 'lucide-react';
import type { ReactNode } from 'react';

const ActionCard = ({
  image,
  title,
  onClick,
  buttonLabel,
  isCompleted,
  className,
}: {
  image: ReactNode;
  title: string;
  onClick?: () => void;
  buttonLabel?: string;
  isCompleted?: boolean;
  className?: string;
}) => {
  return (
    <Card
      className={cn(
        'h-full w-full gap-0 rounded-lg bg-white p-0 shadow dark:bg-[#18273A]',
        isCompleted && 'dark:border-card-tertiary border-primary/40',
        className
      )}>
      <CardHeader
        className={cn(
          'bg-card-tertiary relative flex h-[170px] items-center justify-center gap-6 rounded-t-lg p-8',
          isCompleted && 'dark:bg-card bg-background'
        )}>
        {typeof image === 'string' ? (
          <img
            src={image}
            alt={title}
            className="h-auto max-h-[80px] min-h-[60px] w-auto object-contain"
          />
        ) : (
          image
        )}

        {isCompleted && (
          <Icon
            icon={CheckIcon}
            className="text-primary absolute top-2.5 right-2.5"
            size={16}
            strokeWidth={1.3}
          />
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center justify-between gap-4 p-8">
        <span className="dark:text-card-foreground text-foreground text-center text-base font-semibold">
          {title}
        </span>

        {isCompleted ? (
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
