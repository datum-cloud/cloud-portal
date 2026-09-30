import { ActivityColumn } from './activity-column';
import { AlbsColumn } from './albs-column';
import { DnsZonesColumn } from './dns-zones-column';
import { DomainsColumn } from './domains-column';
import { ProjectHomePluginColumn } from './plugin-column';
import { ProjectTraffic } from './project-traffic';
import { QuotasColumn } from './quotas-column';
import { UsageColumn } from './usage-column';
import { useProjectHomePluginColumns } from '@/modules/plugins/client/plugin-columns';

// Container queries follow the content column, which narrows when a dock
// panel is open, not the viewport.
const GRID_CLASS = 'grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @4xl/main:grid-cols-3';

/**
 * The project home page's columns, in two rows of three. The first row is
 * what's in the project: Domains, DNS zones, any plugin-contributed columns,
 * then Activity. The second is how it's running, under the day's traffic
 * totals: load balancers, usage and quotas.
 *
 * Plugin columns render once the plugin list resolves (the project layout
 * has usually loaded it already) and wrap onto extra rows, so plugins can
 * keep adding them.
 */
export function HomeColumns({
  projectId,
  projectDisplayName,
  orgId,
}: {
  projectId: string;
  projectDisplayName: string;
  orgId: string;
}) {
  const { columns } = useProjectHomePluginColumns(projectId);

  return (
    <div className="flex flex-col gap-4">
      <div className={GRID_CLASS}>
        <DomainsColumn projectId={projectId} />
        <DnsZonesColumn projectId={projectId} />
        {columns.map((column) => (
          <ProjectHomePluginColumn
            key={`${column.plugin.slug}:${column.column.properties.component.$codeRef}`}
            projectId={projectId}
            column={column}
          />
        ))}
        <ActivityColumn projectId={projectId} />
      </div>
      <ProjectTraffic projectId={projectId} />
      <div className={GRID_CLASS}>
        <AlbsColumn projectId={projectId} />
        <UsageColumn projectId={projectId} projectDisplayName={projectDisplayName} orgId={orgId} />
        <QuotasColumn projectId={projectId} />
      </div>
    </div>
  );
}
