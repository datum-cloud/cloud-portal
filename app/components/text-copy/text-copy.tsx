import { useCopyFeedback } from '@/hooks/use-copy-feedback';
import { Button } from '@datum-cloud/datum-ui/button';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { CopyIcon } from 'lucide-react';

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
  const { copied, copyToClipboard } = useCopyFeedback();

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
            copyToClipboard(value);
          }}>
          <CopyIcon className="size-3" />
        </Button>
      </Tooltip>
    </div>
  );
};
