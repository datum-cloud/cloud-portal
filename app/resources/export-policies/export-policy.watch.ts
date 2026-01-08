// app/resources/export-policies/export-policy.watch.ts
import { toExportPolicy } from './export-policy.adapter';
import type { ExportPolicy } from './export-policy.schema';
import { exportPolicyKeys } from './export-policy.service';
import type { ComDatumapisTelemetryV1Alpha1ExportPolicy } from '@/modules/control-plane/telemetry';
import { useResourceWatch } from '@/modules/watch';

/**
 * Watch export policies list for real-time updates.
 *
 * @example
 * ```tsx
 * function ExportPoliciesPage() {
 *   const { data } = useExportPolicies(projectId);
 *
 *   // Subscribe to live updates
 *   useExportPoliciesWatch(projectId);
 *
 *   return <ExportPolicyTable policies={data?.items ?? []} />;
 * }
 * ```
 */
export function useExportPoliciesWatch(projectId: string, options?: { enabled?: boolean }) {
  return useResourceWatch<ExportPolicy>({
    resourceType: 'apis/telemetry.miloapis.com/v1alpha1/exportpolicies',
    projectId,
    namespace: 'default',
    queryKey: exportPolicyKeys.list(projectId),
    transform: (item) => toExportPolicy(item as ComDatumapisTelemetryV1Alpha1ExportPolicy),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Watch a single export policy for real-time updates.
 *
 * @example
 * ```tsx
 * function ExportPolicyDetailPage() {
 *   const { data } = useExportPolicy(projectId, policyName);
 *
 *   // Subscribe to live updates
 *   useExportPolicyWatch(projectId, policyName);
 *
 *   return <ExportPolicyDetail policy={data} />;
 * }
 * ```
 */
export function useExportPolicyWatch(
  projectId: string,
  name: string,
  options?: { enabled?: boolean }
) {
  return useResourceWatch<ExportPolicy>({
    resourceType: 'apis/telemetry.miloapis.com/v1alpha1/exportpolicies',
    projectId,
    namespace: 'default',
    name,
    queryKey: exportPolicyKeys.detail(projectId, name),
    transform: (item) => toExportPolicy(item as ComDatumapisTelemetryV1Alpha1ExportPolicy),
    enabled: options?.enabled ?? true,
  });
}
