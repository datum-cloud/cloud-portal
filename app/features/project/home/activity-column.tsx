import { shortTimeAgo, toRecentItems, type RecentItem } from './home.helpers';
import {
  COLUMN_ROW_CLASS,
  ResourceColumnBody,
  ResourceColumnEmpty,
  ResourceColumnFrame,
  ResourceColumnSkeleton,
} from './resource-column';
import { useProjectActivityClient } from '@/features/activity';
import { KindIcon, kindDisplayName } from '@/features/search/shared/kindIcon';
import { readRecents } from '@/resources/search/search.recents';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { ActivityFeedSummary } from '@datum-cloud/activity-ui';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useQuery } from '@tanstack/react-query';
import { Activity, History } from 'lucide-react';
import { useEffect, useState } from 'react';

type ActivityTab = 'changes' | 'recents';

const TABS: { value: ActivityTab; label: string }[] = [
  { value: 'changes', label: 'Changes' },
  { value: 'recents', label: 'Recents' },
];

/**
 * What's happened in the project lately: the team's changes over the last
 * week, or the resources this person recently opened from search.
 */
export function ActivityColumn({ projectId }: { projectId: string }) {
  const [tab, setTab] = useState<ActivityTab>('changes');

  return (
    <ResourceColumnFrame
      title="Activity"
      href={getPathWithParams(paths.project.detail.activity, { projectId })}
      testId="project-home-activity"
      action={
        <div role="group" aria-label="Show" className="bg-muted flex rounded-md p-0.5">
          {TABS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={tab === option.value}
              onClick={() => setTab(option.value)}
              className={cn(
                'rounded px-2 py-0.5 text-xs transition-colors',
                tab === option.value
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}>
              {option.label}
            </button>
          ))}
        </div>
      }>
      {tab === 'changes' ? (
        <RecentChanges projectId={projectId} />
      ) : (
        <Recents projectId={projectId} />
      )}
    </ResourceColumnFrame>
  );
}

/** The five most recent changes people made, newest first. */
function RecentChanges({ projectId }: { projectId: string }) {
  const { client, resourceLinkResolver } = useProjectActivityClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['project-home-activity', projectId],
    queryFn: async () => {
      const query = await client.createActivityQuery({
        startTime: 'now-7d',
        endTime: 'now',
        filter: 'spec.changeSource == "human"',
        limit: 5,
      });
      return query.status?.results ?? [];
    },
    staleTime: 30_000,
    retry: 1,
  });

  const emptyIcon = <Icon icon={Activity} size={18} aria-hidden />;

  if (isLoading) return <ResourceColumnSkeleton label="Activity" />;
  if (isError) {
    return (
      <ResourceColumnEmpty icon={emptyIcon}>
        Activity isn&apos;t available right now.
      </ResourceColumnEmpty>
    );
  }
  if (!data?.length) {
    return (
      <ResourceColumnEmpty icon={emptyIcon} title="Quiet week">
        Changes people make in this project will show up here.
      </ResourceColumnEmpty>
    );
  }

  const now = new Date();
  return (
    <ul className="flex flex-col">
      {data.map((activity) => {
        const timestamp = activity.metadata?.creationTimestamp;
        return (
          <li key={activity.metadata?.uid ?? activity.metadata?.name} className={COLUMN_ROW_CLASS}>
            <div className="min-w-0 flex-1 truncate">
              <ActivityFeedSummary
                summary={activity.spec.summary}
                links={activity.spec.links}
                resourceLinkResolver={resourceLinkResolver}
              />
            </div>
            {timestamp && (
              <time
                dateTime={timestamp}
                title={new Date(timestamp).toLocaleString()}
                className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {shortTimeAgo(new Date(timestamp), now)}
              </time>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Resources this person recently opened from search in this project. Recents
 * live in localStorage, so they are read after mount to keep the server
 * render and the first client render identical.
 */
function Recents({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<RecentItem[] | null>(null);

  useEffect(() => {
    setItems(toRecentItems(readRecents(`project:${projectId}`).hits));
  }, [projectId]);

  return (
    <ResourceColumnBody
      label="Recents"
      isLoading={items === null}
      items={(items ?? []).map((item) => ({
        key: item.key,
        label: item.label,
        href: item.href,
        icon: <KindIcon kind={item.kind} className="text-icon-quaternary size-3.5 shrink-0" />,
        meta: (
          <Text size="xs" textColor="muted" className="shrink-0">
            {kindDisplayName(item.kind)}
          </Text>
        ),
      }))}
      emptyState={
        <ResourceColumnEmpty
          icon={<Icon icon={History} size={18} aria-hidden />}
          title="Nothing yet">
          Resources you open from search will show up here.
        </ResourceColumnEmpty>
      }
    />
  );
}
