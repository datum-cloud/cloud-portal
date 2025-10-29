import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { Button } from '@/modules/datum-ui/components/button.tsx';
import { cn } from '@/modules/shadcn';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/modules/shadcn/ui/components/tooltip';
import { CopyIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

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
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'size-3 focus-visible:ring-0 focus-visible:ring-offset-0',
              buttonClassName
            )}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              copyToClipboard();
            }}>
            <CopyIcon className="size-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{copied ? 'Copied!' : 'Copy'}</TooltipContent>
      </Tooltip>
    </div>
  );
};
