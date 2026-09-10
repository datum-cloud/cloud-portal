import type { LogEntry, LokiQueryRangeResponse } from '@datum-cloud/datum-ui/logs';
import { flattenLokiStreams, logRequestHost } from '@datum-cloud/datum-ui/logs';

/**
 * queryapi copies every ResourceAttribute and LogAttribute onto the Loki
 * stream. The explorer only needs this subset — k8s/collector identity stays
 * on the wire until queryapi allowlists stream labels.
 */
export const ALB_LOG_LABELS = [
  'method',
  'path',
  'response_code',
  'duration',
  'authority',
  'requested_server_name',
  'x_forwarded_host',
  'referer',
  'request_id',
  'protocol',
  'user_agent',
  'upstream_host',
  'response_flags',
] as const;

const ALB_LOG_LABEL_SET = new Set<string>(ALB_LOG_LABELS);

/**
 * Flattens a Loki `/query_range` envelope into the rows the Logs explorer
 * renders. Empty / error envelopes become an empty list.
 *
 * Envoy's OTEL access-log sink stores JSON fields as attributes with an empty
 * Body; datum-ui reads method / path / status / duration from the labels, so
 * the line is passed through untouched.
 */
export function toLogEntries(response: LokiQueryRangeResponse): LogEntry[] {
  return flattenLokiStreams(response).map((entry) => ({
    ...entry,
    labels: pickAlbLogLabels(entry.labels),
  }));
}

/** Keep the allowlisted labels and stamp the resolved request host onto `host`. */
export function pickAlbLogLabels(labels: Record<string, string>): Record<string, string> {
  const picked: Record<string, string> = {};
  for (const [key, value] of Object.entries(labels)) {
    if (!value || !ALB_LOG_LABEL_SET.has(key)) continue;
    picked[key] = key === 'duration' ? formatDurationLabel(value) : value;
  }
  const host = logRequestHost(picked);
  if (!host) return picked;
  return { host, ...picked };
}

/** Envoy `%DURATION%` is milliseconds with no unit. */
function formatDurationLabel(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || /[a-z]/i.test(trimmed)) return trimmed;
  return `${trimmed}ms`;
}
