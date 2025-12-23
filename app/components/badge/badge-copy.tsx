import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { Badge, type BadgeProps, toast, Tooltip } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { cn } from '@shadcn/lib/utils';
import { CopyIcon } from 'lucide-react';
import { useState } from 'react';

export interface BadgeCopyProps {
  value: string;
  text?: string;
  className?: string;
  textClassName?: string;
  containerClassName?: string;
  badgeType?: BadgeProps['type'];
  badgeTheme?: BadgeProps['theme'];
  showTooltip?: boolean;
}

export const BadgeCopy = ({
  value,
  text,
  className,
  textClassName,
  containerClassName,
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
    <span
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        copyToClipboard();
      }}
      className={cn(
        'flex items-center justify-center transition-colors',
        'hover:bg-black/5 dark:hover:bg-white/5',
        'focus-visible:ring-ring focus-visible:ring-1 focus-visible:outline-hidden',
        'cursor-pointer disabled:pointer-events-none disabled:opacity-50'
      )}
      aria-label={copied ? 'Copied!' : 'Copy to clipboard'}>
      <Icon icon={CopyIcon} className="size-3" />
    </span>
  );

  const badgeContent = (
    <Badge
      type={badgeType}
      theme={badgeTheme}
      className={cn(
        'flex cursor-default items-center gap-2.5 rounded-md px-1.5 py-[5px] text-sm font-normal',
        className
      )}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}>
      <span className={textClassName}>{displayText}</span>
      {showTooltip ? (
        <Tooltip message={copied ? 'Copied!' : 'Copy'}>{copyButton}</Tooltip>
      ) : (
        copyButton
      )}
    </Badge>
  );

  return <div className={cn('w-fit', containerClassName)}>{badgeContent}</div>;
};
