import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { Button } from '@datum-cloud/datum-ui/button';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const copyToClipboard = () => {
    if (!value) return;

    void copy(value).then((success) => {
      if (!success) {
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        setCopied(false);
        toast.error('Could not copy to clipboard');
        return;
      }

      toast.success('Copied to clipboard');
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 2000);
    });
  };

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
    </Text>
  );
};
