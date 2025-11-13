import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { Badge, type BadgeProps, Tooltip } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { CopyIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export interface BadgeCopyProps {
  value: string;
  text?: string;
  className?: string;
  badgeType?: BadgeProps['type'];
  badgeTheme?: BadgeProps['theme'];
  showTooltip?: boolean;
}

export const BadgeCopy = ({
  value,
  text,
  className,
  badgeType = 'secondary',
  badgeTheme = 'light',
  showTooltip = true,
}: BadgeCopyProps) => {
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

  const displayText = text ?? value;

  const copyButton = (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        copyToClipboard();
      }}
      className={cn(
        'flex items-center justify-center rounded-sm transition-colors',
        'hover:bg-black/5 dark:hover:bg-white/5',
        'focus-visible:ring-ring focus-visible:ring-1 focus-visible:outline-hidden',
        'disabled:pointer-events-none disabled:opacity-50',
        '-mr-0.5 ml-0.5'
      )}
      aria-label={copied ? 'Copied!' : 'Copy to clipboard'}>
      <CopyIcon className="size-3" />
    </button>
  );

  const badgeContent = (
    <Badge
      type={badgeType}
      theme={badgeTheme}
      className={cn(
        'flex cursor-default items-center gap-1.5 px-2 py-0.5 text-xs font-normal',
        className
      )}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}>
      <span>{displayText}</span>
      {showTooltip ? (
        <Tooltip message={copied ? 'Copied!' : 'Copy'}>{copyButton}</Tooltip>
      ) : (
        copyButton
      )}
    </Badge>
  );

  return <div className="w-fit">{badgeContent}</div>;
};
