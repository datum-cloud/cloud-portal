import { ActivityColumn } from './activity-column';
import { DomainsColumn } from './domains-column';
import { ResourceCardSkeleton } from './home-skeleton';
import { LoadBalancersColumn } from './load-balancers-column';
import { ProjectHomePluginColumn } from './plugin-column';
import { ProjectTraffic } from './project-traffic';
import { useProjectHomePluginColumns } from '@/modules/plugins/client/plugin-columns';
import { cn } from '@datum-cloud/datum-ui/utils';
import type { ReactNode } from 'react';

/**
 * The project home page's columns: Domains, any plugin-contributed columns,
 * then ALB, above the day's traffic totals, with Activity in its own
 * full-width row below. With no plugin columns, Domains and ALB share the
 * row between them rather than leaving an empty slot.
 *
 * Plugin columns wrap onto extra rows, so plugins can keep adding them.
 * Container queries follow the content column, which narrows when a dock
 * panel is open, not the viewport.
 */
export function HomeColumns({
  projectId,
  beforeTraffic,
}: {
  projectId: string;
  /** Rendered between the resource columns and traffic, e.g. the home page's next-step suggestions. */
  beforeTraffic?: ReactNode;
}) {
  const { columns, isLoading } = useProjectHomePluginColumns(projectId);

  return (
    <div className="flex flex-col gap-8">
      <div
        className={cn(
          'grid grid-cols-1 gap-4 @xl/main:grid-cols-2',
          (isLoading || columns.length > 0) && '@4xl/main:grid-cols-3'
        )}>
        <DomainsColumn projectId={projectId} />
        {isLoading ? (
          <div role="status" aria-label="Loading columns">
            <ResourceCardSkeleton />
          </div>
        ) : (
          columns.map((column) => (
            <ProjectHomePluginColumn
              key={`${column.plugin.slug}:${column.column.properties.component.$codeRef}`}
              projectId={projectId}
              column={column}
            />
          ))
        )}
        <LoadBalancersColumn projectId={projectId} />
      </div>
      {beforeTraffic}
      <ProjectTraffic projectId={projectId} />
      <ActivityColumn projectId={projectId} />
    </div>
  );
}
