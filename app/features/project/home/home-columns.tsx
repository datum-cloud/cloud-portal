import { ActivityColumn } from './activity-column';
import { DomainsColumn } from './domains-column';
import { ProjectHomePluginColumn } from './plugin-column';
import { ProjectTraffic } from './project-traffic';
import { ResourceColumnSkeleton } from './resource-column';
import { WorkloadsColumn } from './workloads-column';
import { useProjectHomePluginColumns } from '@/modules/plugins/client/plugin-columns';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';

/**
 * The project home page's columns: Domains, any plugin-contributed columns,
 * then Activity, above the day's traffic totals. Until a plugin provides a
 * column, a Workloads placeholder holds the middle slot.
 *
 * Plugin columns wrap onto extra rows, so plugins can keep adding them.
 * Container queries follow the content column, which narrows when a dock
 * panel is open, not the viewport.
 */
export function HomeColumns({ projectId }: { projectId: string }) {
  const { columns, isLoading } = useProjectHomePluginColumns(projectId);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-8 @xl/main:grid-cols-2 @4xl/main:grid-cols-3">
        <DomainsColumn projectId={projectId} />
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-24 rounded" />
            <ResourceColumnSkeleton label="columns" />
          </div>
        ) : columns.length > 0 ? (
          columns.map((column) => (
            <ProjectHomePluginColumn
              key={`${column.plugin.slug}:${column.column.properties.component.$codeRef}`}
              projectId={projectId}
              column={column}
            />
          ))
        ) : (
          <WorkloadsColumn />
        )}
        <ActivityColumn projectId={projectId} />
      </div>
      <ProjectTraffic projectId={projectId} />
    </div>
  );
}
