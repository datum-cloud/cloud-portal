import { kindDisplayName } from './kindIcon';
import type { SearchTarget } from '@/resources/search';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { ShieldAlert, X } from 'lucide-react';

interface Props {
  deniedKinds: SearchTarget[];
  onDismiss: () => void;
}

/**
 * Informational (NOT alert) banner shown above results when the search
 * server permitted some kinds but refused others. Listing what's
 * hidden is critical so the user understands why an expected hit
 * might be missing.
 *
 * role="status" deliberately — this is a passive announcement, not
 * an interruption. Screen readers should pick it up via aria-live.
 */
export function SearchPartialPermissionNote({ deniedKinds, onDismiss }: Props) {
  if (deniedKinds.length === 0) return null;

  const names = deniedKinds.map((k) => kindDisplayName(k.kind));
  const list =
    names.length === 1
      ? names[0]
      : names.length === 2
        ? `${names[0]} and ${names[1]}`
        : `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`;

  return (
    <div
      role="status"
      className="bg-card-warning text-card-warning-foreground mx-2 my-1 flex items-start gap-2 rounded px-3 py-2 text-xs">
      <Icon icon={ShieldAlert} size={16} className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span className="flex-1">
        Some kinds hidden — you don&apos;t have permission to search <strong>{list}</strong>.
      </span>
      <Button aria-label="Dismiss permission note" size="xs" type="quaternary" onClick={onDismiss}>
        <Icon icon={X} size={12} className="size-3" aria-hidden />
      </Button>
    </div>
  );
}
