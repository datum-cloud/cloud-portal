import { DomainsColumn } from './domains-column';
import { ProjectHomePluginColumn } from './plugin-column';
import { RecentsColumn } from './recents-column';
import { ResourceColumnSkeleton } from './resource-column';
import { WorkloadsColumn } from './workloads-column';
import { useProjectHomePluginColumns } from '@/modules/plugins/client/plugin-columns';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';

/**
 * The project home page's row of resource lists: Domains, then any
 * plugin-contributed columns, then Recents. Columns are at least 16rem wide
 * and wrap onto new rows as the page narrows, so plugins can keep adding
 * them. Until a plugin provides a column, a Workloads placeholder holds the
 * middle slot.
 */
export function HomeColumns({ projectId }: { projectId: string }) {
  const { columns, isLoading } = useProjectHomePluginColumns(projectId);

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-8">
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
      <RecentsColumn projectId={projectId} />
    </div>
  );
}
