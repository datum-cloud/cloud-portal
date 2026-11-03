import type { WebsiteResourceType } from './registry';
import { getProjectControlPlanePath } from '@/resources/base/utils';

/** One listed resource as the website sees it: its name, plus the display name when set. */
export interface ResourceNameItem {
  name: string;
  displayName?: string;
}

/** Response body of the resource list route. `truncated` is set when the 500-item cap was hit. */
export interface ResourceList {
  items: ResourceNameItem[];
  truncated?: true;
}

/** The upstream LIST answered with a non-2xx status; `status` is that HTTP status. */
export class UpstreamListError extends Error {
  constructor(
    readonly status: number,
    message?: string
  ) {
    super(message ?? `Upstream list failed with status ${status}`);
    this.name = 'UpstreamListError';
  }
}

/** Input for one list call. `accessToken` is the signed-in user's own token. */
export interface ListArgs {
  projectId: string;
  type: WebsiteResourceType;
  accessToken: string;
  requestId?: string;
  signal?: AbortSignal;
}

/** Lists the names of one resource type in a project. Rejects with `UpstreamListError` on non-2xx. */
export type ResourceLister = (args: ListArgs) => Promise<ResourceList>;

const LIST_LIMIT = 500;
const METADATA_ACCEPT = 'application/json;as=PartialObjectMetadataList;g=meta.k8s.io;v=v1';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toItem(raw: unknown, displayNameAnnotation: string): ResourceNameItem | undefined {
  if (!isObject(raw) || !isObject(raw.metadata)) return undefined;
  const { name, annotations } = raw.metadata;
  if (typeof name !== 'string' || name === '') return undefined;

  const annotation = isObject(annotations) ? annotations[displayNameAnnotation] : undefined;
  const displayName = typeof annotation === 'string' ? annotation.trim() : '';
  return displayName ? { name, displayName } : { name };
}

/**
 * Maps a (PartialObjectMetadata) List body to `{ items, truncated? }`, keeping only
 * each item's name and the given display annotation. Tolerates any input shape.
 */
export function toResourceList(body: unknown, displayNameAnnotation: string): ResourceList {
  if (!isObject(body)) return { items: [] };

  const rawItems: unknown[] = Array.isArray(body.items) ? body.items : [];
  const items = rawItems.flatMap((raw) => {
    const item = toItem(raw, displayNameAnnotation);
    return item ? [item] : [];
  });

  const hasContinue = isObject(body.metadata) && Boolean(body.metadata.continue);
  return hasContinue ? { items, truncated: true } : { items };
}

/**
 * Lister backed by one metadata-only LIST against the project's control plane on
 * `apiUrl` (spec and status never leave the API server).
 */
export function createLiveLister(apiUrl: string, fetchImpl: typeof fetch = fetch): ResourceLister {
  const base = apiUrl.replace(/\/+$/, '');

  return async ({ projectId, type, accessToken, requestId, signal }) => {
    const url =
      `${base}${getProjectControlPlanePath(projectId)}` +
      `/apis/${type.group}/${type.version}/namespaces/${type.namespace}/${type.plural}` +
      `?limit=${LIST_LIMIT}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      Accept: METADATA_ACCEPT,
      ...(requestId ? { 'X-Request-ID': requestId } : {}),
    };

    const res = await fetchImpl(url, { method: 'GET', headers, signal });
    if (!res.ok) {
      await res.body?.cancel().catch(() => undefined);
      throw new UpstreamListError(res.status);
    }
    return toResourceList(await res.json(), type.displayNameAnnotation);
  };
}
