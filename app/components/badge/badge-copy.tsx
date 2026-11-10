import { useCopyFeedback } from '@/hooks/use-copy-feedback';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { type BadgeProps } from '@datum-cloud/datum-ui/badge';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { CopyIcon } from 'lucide-react';

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
  const { copied, copyToClipboard } = useCopyFeedback();

  const displayText = text ?? value;

  const copyButton = (
    <span className={cn('flex items-center justify-center', copyButtonClassName)} aria-hidden>
      <Icon icon={CopyIcon} className="size-3" />
    </span>
  );

  const badge = (
    <Badge
      type={badgeType}
      theme={badgeTheme}
      role="button"
      tabIndex={0}
      aria-label={copied ? 'Copied!' : `Copy ${displayText}`}
      className={cn(
        // Focus shows on the badge's own border, in the form-field focus colour,
        // instead of the Badge base's dark ring.
        'focus-visible:border-input-focus-border flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-[5px] font-mono text-xs font-normal focus:ring-0 focus:ring-offset-0 focus-visible:shadow-(--input-focus-shadow) focus-visible:outline-none',
        className
      )}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        copyToClipboard(value);
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        // Space would otherwise scroll the page; stopping keeps a parent row from opening too.
        event.preventDefault();
        event.stopPropagation();
        copyToClipboard(value);
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
