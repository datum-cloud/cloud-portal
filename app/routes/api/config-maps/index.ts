import { createConfigMapsControl } from '@/resources/control-plane/config-maps.control';
import { BadRequestError } from '@/utils/errors';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, LoaderFunctionArgs, data } from 'react-router';

export const ROUTE_PATH = '/api/config-maps' as const;

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const { controlPlaneClient, cache } = context as AppLoadContext;
  const configMapsControl = createConfigMapsControl(controlPlaneClient as Client);

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');
  const noCache = false;

  if (!projectId) {
    throw new BadRequestError('Project ID is required');
  }

  const key = `config-maps:${projectId}`;

  // Try to get cached config maps if caching is enabled
  const [isCached, cachedConfigMaps] = await Promise.all([
    !noCache && cache.hasItem(key),
    !noCache && cache.getItem(key),
  ]);

  // Return cached config maps if available and caching is enabled
  if (isCached && cachedConfigMaps) {
    return data({ success: true, data: cachedConfigMaps }, { status: 200 });
  }

  // Fetch fresh config maps from control plane
  const configMaps = await configMapsControl.list(projectId);

  // Cache the fresh config maps if caching is enabled
  await cache.setItem(key, configMaps).catch((error) => {
    console.error('Failed to cache config maps:', error);
  });
  return data({ success: true, data: configMaps }, { status: 200 });
};
