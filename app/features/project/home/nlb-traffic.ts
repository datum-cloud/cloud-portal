/**
 * Network load balancer traffic for the project home.
 *
 * The resource-metrics aggregator records per-listener counters for every
 * NLB (datum-cloud/infra#9055), labelled with the project, `resource_name`
 * (the NLB), `listener` and `region`. Only inbound counters are read: the
 * gateway forwards with direct server return, so replies go from the backend
 * to the client without passing it and the transmit series stay at 0.
 *
 * NLB pages belong to the networking plugin, so the portal finds them through
 * the plugin's mount rather than its own routes.
 */
import { resetGuardedIncrease } from '@/features/edge/proxy/metrics/queries';
import { buildPrometheusLabelSelector } from '@/modules/metrics';
import { useProjectPlugins } from '@/modules/plugins/client/use-project-plugins';
import type { PublicPlugin } from '@/modules/plugins/types';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useMemo } from 'react';

export const NLB_RECEIVE_BYTES_METRIC = 'datum_nlb_listener_receive_bytes_total';
export const NLB_RECEIVE_PACKETS_METRIC = 'datum_nlb_listener_receive_packets_total';
export const NLB_RECEIVE_DROPPED_METRIC = 'datum_nlb_listener_receive_dropped_packets_total';
/** A gauge recorded for every programmed listener, traffic or not. */
export const NLB_BACKENDS_METRIC = 'datum_nlb_listener_backends';

/** `name` in the networking plugin's `plugin-manifest.json`. */
export const NETWORKING_PLUGIN_MANIFEST_NAME = 'network.networking.datumapis.com';

function nlbSelector(projectId: string): string {
  return buildPrometheusLabelSelector({
    baseLabels: {
      resourcemanager_datumapis_com_project_name: projectId,
      resource_namespace: 'default',
    },
  });
}

/** How many NLBs in the project recorded a listener over `window`. */
export function projectNlbCountQuery(projectId: string, window: string): string {
  return `count(count by (resource_name) (last_over_time(${NLB_BACKENDS_METRIC}${nlbSelector(projectId)}[${window}])))`;
}

/** Bytes per second received across every NLB in the project. */
export function projectNlbBytesRateQuery(projectId: string, timeWindow: string): string {
  return `sum(rate(${NLB_RECEIVE_BYTES_METRIC}${nlbSelector(projectId)}[${timeWindow}]))`;
}

/** Bytes received across every NLB in the project over `window`. */
export function projectNlbBytesQuery(projectId: string, window: string): string {
  return `sum(${resetGuardedIncrease(NLB_RECEIVE_BYTES_METRIC, nlbSelector(projectId), window)})`;
}

/** Packets per second received across every NLB in the project. */
export function projectNlbPacketsRateQuery(projectId: string, timeWindow: string): string {
  return `sum(rate(${NLB_RECEIVE_PACKETS_METRIC}${nlbSelector(projectId)}[${timeWindow}]))`;
}

/** Packets received across every NLB in the project over `window`. */
export function projectNlbPacketsQuery(projectId: string, window: string): string {
  return `sum(${resetGuardedIncrease(NLB_RECEIVE_PACKETS_METRIC, nlbSelector(projectId), window)})`;
}

/** Inbound packets dropped per second across every NLB in the project. */
export function projectNlbDroppedRateQuery(projectId: string, timeWindow: string): string {
  return `sum(rate(${NLB_RECEIVE_DROPPED_METRIC}${nlbSelector(projectId)}[${timeWindow}]))`;
}

/** Inbound packets dropped across every NLB in the project over `window`. */
export function projectNlbDroppedQuery(projectId: string, window: string): string {
  return `sum(${resetGuardedIncrease(NLB_RECEIVE_DROPPED_METRIC, nlbSelector(projectId), window)})`;
}

/**
 * The slug the networking plugin is mounted under. It is operator-supplied
 * (`PORTAL_PLUGINS` in dev, the PortalPlugin resource in production), so it
 * is found by the manifest name rather than hard-coded.
 */
export function findNetworkingPluginSlug(plugins: PublicPlugin[] | undefined): string | undefined {
  return plugins?.find((plugin) => plugin.manifest.name === NETWORKING_PLUGIN_MANIFEST_NAME)?.slug;
}

/** The NLB list in the networking plugin, or undefined when the plugin isn't mounted. */
export function nlbListHref(projectId: string, pluginSlug: string | undefined): string | undefined {
  if (!pluginSlug) return undefined;
  const root = getPathWithParams(paths.project.detail.services.plugin, {
    projectId,
    serviceSlug: pluginSlug,
  });
  return `${root}/nlb`;
}

export function useNlbListHref(projectId: string): string | undefined {
  const { data: plugins } = useProjectPlugins(projectId, { enabled: !!projectId });
  return useMemo(
    () => nlbListHref(projectId, findNetworkingPluginSlug(plugins)),
    [projectId, plugins]
  );
}
