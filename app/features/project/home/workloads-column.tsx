import { ResourceColumn, ResourceColumnEmpty } from './resource-column';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Boxes } from 'lucide-react';

/**
 * Placeholder for the Workloads column. It lists nothing yet: listing
 * workloads and handling Compute enablement come in a later change.
 */
export function WorkloadsColumn() {
  return (
    <ResourceColumn
      title="Workloads"
      items={[]}
      testId="project-home-workloads"
      emptyState={
        <ResourceColumnEmpty
          icon={<Icon icon={Boxes} size={18} className="text-icon-quaternary" aria-hidden />}>
          Workloads are coming to this page soon.
        </ResourceColumnEmpty>
      }
    />
  );
}
