import { toRecentItems, type RecentItem } from './home.helpers';
import { ResourceColumn, ResourceColumnEmpty } from './resource-column';
import { KindIcon, kindDisplayName } from '@/features/search/shared/kindIcon';
import { readRecents } from '@/resources/search/search.recents';
import { Text } from '@datum-cloud/datum-ui/typography';
import { useEffect, useState } from 'react';

/**
 * Resources the user recently opened from search in this project. Recents
 * live in localStorage, so they are read after mount to keep the server
 * render and the first client render identical.
 */
export function RecentsColumn({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<RecentItem[] | null>(null);

  useEffect(() => {
    setItems(toRecentItems(readRecents(`project:${projectId}`).hits));
  }, [projectId]);

  return (
    <ResourceColumn
      title="Recents"
      isLoading={items === null}
      testId="project-home-recents"
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
        <ResourceColumnEmpty>Resources you open from search will show here.</ResourceColumnEmpty>
      }
    />
  );
}
