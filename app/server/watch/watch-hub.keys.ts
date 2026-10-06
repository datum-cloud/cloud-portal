import type { UpstreamWatch, WatchSubscribeRequest } from './watch-hub.types';
import { buildWatchUpstreamPath } from '@/modules/watch/watch-path';
import { env } from '@/utils/env/env.server';

/** Must match the client-side `WatchManager.buildChannelKey()` format exactly. */
export function buildChannelKey(req: WatchSubscribeRequest): string {
  return [
    req.resourceType,
    req.orgId ?? '',
    req.projectId ?? '',
    req.namespace ?? '',
    req.name ?? '',
    req.labelSelector ?? '',
    req.fieldSelector ?? '',
    req.userScoped ? 'user' : '', // 8th segment — must match WatchManager.buildChannelKey
  ].join(':');
}

/** Channel plus user ID, so users never share an upstream (or its token). Never sent to clients. */
export function buildWatchKey(req: WatchSubscribeRequest, userId: string): string {
  return watchKeyForChannel(buildChannelKey(req), userId);
}

export function watchKeyForChannel(channel: string, userId: string): string {
  return `${channel}:${userId}`;
}

export function buildUpstreamUrl(req: WatchSubscribeRequest, userId?: string): string {
  const baseUrl = env.public.apiUrl;
  const path = buildWatchUpstreamPath(req, userId);

  const params = new URLSearchParams();

  // Named watches use a fieldSelector on the collection, like the client WatchManager.
  if (req.name) {
    const nameSelector = `metadata.name=${req.name}`;
    if (req.fieldSelector) {
      params.set('fieldSelector', `${req.fieldSelector},${nameSelector}`);
    } else {
      params.set('fieldSelector', nameSelector);
    }
  } else if (req.fieldSelector) {
    params.set('fieldSelector', req.fieldSelector);
  }

  if (req.labelSelector) params.set('labelSelector', req.labelSelector);

  const query = params.toString();
  return query ? `${baseUrl}${path}?${query}` : `${baseUrl}${path}`;
}

/**
 * Always include resourceVersion: the resourcemanager control-plane proxy
 * requires it to start the stream. Bookmarks let a reconnect resume without a 410 storm.
 */
export function buildWatchUrl(upstream: Pick<UpstreamWatch, 'url' | 'resourceVersion'>): string {
  const separator = upstream.url.includes('?') ? '&' : '?';
  return (
    `${upstream.url}${separator}watch=true` +
    `&allowWatchBookmarks=true` +
    `&timeoutSeconds=300` +
    `&resourceVersion=${upstream.resourceVersion}`
  );
}
