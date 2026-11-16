import { useCopyFeedback } from '@/hooks/use-copy-feedback';
import { Button } from '@datum-cloud/datum-ui/button';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { CheckIcon, CopyIcon } from 'lucide-react';

interface TextCopyBoxProps {
  value: string;
  className?: string;
  contentClassName?: string;
  buttonClassName?: string;
  /** Button variant: 'default' shows text with border, 'icon-only' shows just the icon */
  buttonVariant?: 'default' | 'icon-only';
}

export const TextCopyBox = ({
  value,
  className,
  contentClassName,
  buttonClassName,
  buttonVariant = 'default',
}: TextCopyBoxProps) => {
  const { copied, copyToClipboard } = useCopyFeedback();

  return (
    <Text
      as="div"
      className={cn(
        'group border-input bg-background flex h-10 w-full overflow-hidden rounded-md border focus-within:outline-hidden',
        className
      )}>
      <Text
        as="div"
        className={cn(
          'flex w-full items-center overflow-hidden px-3 py-2 opacity-50',
          contentClassName
        )}>
        <span className="truncate">{value}</span>
      </Text>
      <div className="flex items-center py-2 pr-3">
        {buttonVariant === 'icon-only' ? (
          <button
            type="button"
            className={cn(
              'text-muted-foreground hover:text-foreground flex size-7 items-center justify-center rounded-sm transition-colors',
              buttonClassName
            )}
            onClick={() => copyToClipboard(value)}>
            {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
          </button>
        ) : (
          <Button
            type="quaternary"
            theme="outline"
            size="small"
            className={cn('h-7 w-fit gap-1 px-2 text-xs', buttonClassName)}
            onClick={() => copyToClipboard(value)}>
            <CopyIcon className="size-3!" />
            {copied ? 'Copied' : 'Copy'}
          </Button>
        )}
      </div>
    </Text>
  );
};
