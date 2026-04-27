import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { type BadgeProps } from '@datum-cloud/datum-ui/badge';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
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
  copyButtonClassName?: string;
  'data-e2e'?: string;
  wrapperTooltipMessage?: string | React.ReactNode;
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
  copyButtonClassName,
  'data-e2e': dataE2e,
  wrapperTooltipMessage,
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
      className={cn('flex items-center justify-center', copyButtonClassName)}
      aria-label={copied ? 'Copied!' : 'Copy to clipboard'}>
      <Icon icon={CopyIcon} className="size-3" />
    </span>
  );

  const badge = (
    <Badge
      type={badgeType}
      theme={badgeTheme}
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-[5px] font-mono text-xs font-normal',
        className
      )}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        copyToClipboard();
      }}>
      <span className={textClassName}>{displayText}</span>
      {copyButton}
    </Badge>
  );

  const badgeContent = showTooltip ? (
    <Tooltip message={copied ? 'Copied!' : 'Copy'}>{badge}</Tooltip>
  ) : (
    badge
  );

  const wrappedBadge = (
    <div className={cn('w-fit', containerClassName)} data-e2e={dataE2e}>
      {badgeContent}
    </div>
  );

  if (wrapperTooltipMessage) {
    return <Tooltip message={wrapperTooltipMessage}>{wrappedBadge}</Tooltip>;
  }

  return wrappedBadge;
};
