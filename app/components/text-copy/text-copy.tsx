import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { Button, toast } from '@datum-ui/components';
import { Tooltip } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { CopyIcon } from 'lucide-react';
import { useState } from 'react';

export const TextCopy = ({
  value,
  text,
  className,
  buttonClassName,
}: {
  value: string;
  text?: string;
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
    <div className="flex items-center gap-2">
      <span className={className}>{text ?? value}</span>
      <Tooltip message={copied ? 'Copied!' : 'Copy'}>
        <Button
          type="quaternary"
          theme="borderless"
          size="icon"
          className={cn('size-3 focus-visible:ring-0 focus-visible:ring-offset-0', buttonClassName)}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            copyToClipboard();
          }}>
          <CopyIcon className="size-3" />
        </Button>
      </Tooltip>
    </div>
  );
};
