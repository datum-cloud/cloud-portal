import { toRecentItems, type RecentItem } from './home.helpers';
import { ResourceColumnBody, ResourceColumnEmpty, ResourceColumnFrame } from './resource-column';
import { ResourceActivityFeed, useProjectActivityClient } from '@/features/activity';
import { KindIcon, kindDisplayName } from '@/features/search/shared/kindIcon';
import { readRecents } from '@/resources/search/search.recents';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { History } from 'lucide-react';
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
      bodyClassName="h-auto"
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
      {tab === 'changes' ? <RecentChanges /> : <Recents projectId={projectId} />}
    </ResourceColumnFrame>
  );
}

/**
 * Changes people made in the last week, in the same day-grouped digest the
 * project Activity page shows, with repeated changes collapsed into one row.
 * The search and filter bar stay on the Activity page, and filters are never
 * written to the home page URL.
 */
function RecentChanges() {
  const { client, resourceLinkResolver } = useProjectActivityClient();

  return (
    <ResourceActivityFeed
      client={client}
      resourceLinkResolver={resourceLinkResolver}
      changeSource="human"
      compact={false}
      variant="digest"
      pageSize={10}
      urlSync={false}
      feedProps={{ showFilters: false }}
    />
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
