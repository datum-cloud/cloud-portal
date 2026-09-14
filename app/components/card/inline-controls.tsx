import { Badge } from '@datum-cloud/datum-ui/badge';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { PencilIcon } from 'lucide-react';

/** "—" pill for values we can't show, optionally explaining why on hover. */
export function UnavailableBadge({ reason }: { reason?: string }) {
  const badge = (
    <Badge
      type="quaternary"
      theme="outline"
      className="text-muted-foreground rounded-xl text-xs font-normal">
      &mdash;
    </Badge>
  );
  return reason ? (
    <Tooltip message={reason} side="bottom">
      {badge}
    </Tooltip>
  ) : (
    badge
  );
}

/** Small inline pencil that opens a dialog for a single row. */
export function EditPencil({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="text-muted-foreground hover:text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      onClick={onClick}>
      <Icon icon={PencilIcon} size={12} />
    </button>
  );
}
