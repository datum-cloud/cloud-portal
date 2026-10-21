import { ResourceColumn, ResourceColumnEmpty } from './resource-column';

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
        <ResourceColumnEmpty>Workloads are coming to this page soon.</ResourceColumnEmpty>
      }
    />
  );
}
