import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { Button, toast } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { useState } from 'react';

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
  const [_, copy] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    if (!value) return;

    copy(value).then(() => {
      toast.success('Copied to clipboard');
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    });
  };

  return (
    <div
      className={cn(
        'group border-input bg-background flex h-10 w-full overflow-hidden rounded-md border text-sm focus-within:outline-hidden',
        className
      )}>
      <div
        className={cn(
          'flex w-full items-center overflow-hidden px-3 py-2 text-sm opacity-50',
          contentClassName
        )}>
        <span className="truncate">{value}</span>
      </div>
      <div className="flex items-center py-2 pr-3">
        {buttonVariant === 'icon-only' ? (
          <button
            type="button"
            className={cn(
              'text-muted-foreground hover:text-foreground flex size-7 items-center justify-center rounded-sm transition-colors',
              buttonClassName
            )}
            onClick={copyToClipboard}>
            {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
          </button>
        ) : (
          <Button
            type="quaternary"
            theme="outline"
            size="small"
            className={cn('h-7 w-fit gap-1 px-2 text-xs', buttonClassName)}
            onClick={copyToClipboard}>
            <CopyIcon className="size-3!" />
            {copied ? 'Copied' : 'Copy'}
          </Button>
        )}
      </div>
    </div>
  );
};
