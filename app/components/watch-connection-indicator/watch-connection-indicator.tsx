import { SYNC_COPY } from '@/modules/watch/sync-copy';
import { useWatchConnection } from '@/modules/watch/use-watch-connection';
import type { WatchConnectionState } from '@/modules/watch/watch.manager';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { CheckIcon, CloudOffIcon, RefreshCwIcon, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

/** A short drop is normal (deploys, a tab switch); only a longer one is worth a message. */
export const RECONNECTING_NOTICE_DELAY_MS = 3000;
export const RECOVERED_NOTICE_MS = 2000;

type Notice = 'reconnecting' | 'degraded' | 'recovered';

const NOTICES: Record<Notice, { text: string; icon: LucideIcon; className: string }> = {
  reconnecting: {
    text: SYNC_COPY.reconnecting,
    icon: RefreshCwIcon,
    className: 'motion-safe:animate-spin',
  },
  degraded: { text: SYNC_COPY.degraded, icon: CloudOffIcon, className: '' },
  recovered: { text: SYNC_COPY.recovered, icon: CheckIcon, className: '' },
};

// "Back in sync" only follows a notice the user actually saw.
function noticeFor(state: WatchConnectionState, current: Notice | null): Notice | null {
  if (state === 'degraded') return 'degraded';
  if (state === 'reconnecting') {
    return current === 'degraded' || current === 'recovered' ? 'reconnecting' : current;
  }
  return current === 'reconnecting' || current === 'degraded' ? 'recovered' : current;
}

interface WatchConnectionIndicatorProps {
  state?: WatchConnectionState;
}

/** Tells the user when live updates are delayed or paused, and when they recover. */
export function WatchConnectionIndicator({ state }: WatchConnectionIndicatorProps) {
  const connection = useWatchConnection();
  const effective = state ?? connection;
  const [notice, setNotice] = useState<Notice | null>(() => noticeFor(effective, null));
  // Derive the notice during render so the text changes in the same commit.
  const [seen, setSeen] = useState(effective);
  if (seen !== effective) {
    setSeen(effective);
    setNotice(noticeFor(effective, notice));
  }

  useEffect(() => {
    if (effective !== 'reconnecting') return;
    const timer = setTimeout(() => setNotice('reconnecting'), RECONNECTING_NOTICE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [effective]);

  useEffect(() => {
    if (notice !== 'recovered') return;
    const timer = setTimeout(() => setNotice(null), RECOVERED_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const shown = notice ? NOTICES[notice] : null;

  // Always rendered (empty while live) so screen readers already track the live region.
  return (
    <div role="status" data-cy="watch-connection-indicator" className="flex min-w-0 items-center">
      {shown && (
        <span className="flex min-w-0 items-center gap-1.5 px-3">
          <Icon
            icon={shown.icon}
            aria-hidden="true"
            className={cn('text-muted-foreground size-3.5 shrink-0', shown.className)}
          />
          <Text as="span" size="xs" textColor="muted" className="truncate">
            {shown.text}
          </Text>
        </span>
      )}
    </div>
  );
}
