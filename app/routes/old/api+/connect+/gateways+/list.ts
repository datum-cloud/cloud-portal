import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { createGatewaysControl } from '@/resources/control-plane/gateways.control';
import { CustomError } from '@/utils/error';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, LoaderFunctionArgs, data } from 'react-router';

export const ROUTE_PATH = '/api/connect/gateways/list' as const;

export const loader = withMiddleware(async ({ request, context }: LoaderFunctionArgs) => {
  const { controlPlaneClient, cache } = context as AppLoadContext;
  const gatewaysControl = createGatewaysControl(controlPlaneClient as Client);

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');
  const noCache = url.searchParams.get('noCache');

  if (!projectId) {
    throw new CustomError('Project ID is required', 400);
  }

  const key = `gateways:${projectId}`;

  // Try to get cached networks if caching is enabled
  const [isCached, cachedGateways] = await Promise.all([
    !noCache && cache.hasItem(key),
    !noCache && cache.getItem(key),
  ]);

  // Return cached networks if available and caching is enabled
  if (isCached && cachedGateways) {
    return data(cachedGateways);
  }

  // Fetch fresh networks from control plane
  const gateways = await gatewaysControl.list(projectId);

  // Cache the fresh networks if caching is enabled
  await cache.setItem(key, gateways).catch((error) => {
    console.error('Failed to cache gateways:', error);
  });
  return data(gateways);
}, authMiddleware);
