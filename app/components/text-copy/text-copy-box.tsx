import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { Button } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { CopyIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export const TextCopyBox = ({
  value,
  className,
  buttonClassName,
}: {
  value: string;
  className?: string;
  buttonClassName?: string;
}) => {
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
      <div className="flex w-full items-center overflow-hidden px-3 py-2 text-sm text-ellipsis opacity-50">
        {value}
      </div>
      <div className="flex items-center py-2 pr-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('h-7 w-fit gap-1 px-2 text-xs', buttonClassName)}
          onClick={copyToClipboard}>
          <CopyIcon className="size-3!" />
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  );
};
