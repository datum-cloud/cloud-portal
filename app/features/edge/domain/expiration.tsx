import { DateTime } from '@/components/date-time';
import { Badge } from '@datum-ui/components';
import { addMonths, isBefore } from 'date-fns';

export interface DomainExpirationProps {
  expiresAt?: string;
  showBadge?: boolean;
}

export const DomainExpiration = ({ expiresAt, showBadge = true }: DomainExpirationProps) => {
  if (!expiresAt) return <>-</>;

  const expiresDate = new Date(expiresAt);
  const soonThreshold = addMonths(new Date(), 1);
  const isExpiringSoon = isBefore(expiresDate, soonThreshold);

  return (
    <div className="flex items-center gap-2">
      <DateTime date={expiresAt} format="yyyy-MM-dd" />
      {showBadge && isExpiringSoon && (
        <Badge
          type="danger"
          className="pointer-events-none cursor-default px-1.5 py-0.5 text-[10px]">
          Expiring soon
        </Badge>
      )}
    </div>
  );
};
