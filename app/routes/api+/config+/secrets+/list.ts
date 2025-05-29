import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { createSecretsControl } from '@/resources/control-plane/secrets.control';
import { CustomError } from '@/utils/errorHandle';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, data } from 'react-router';

export const ROUTE_PATH = '/api/config/secrets/list' as const;

export const loader = withMiddleware(async ({ request, context }) => {
  const { controlPlaneClient, cache } = context as AppLoadContext;
  const secretsControl = createSecretsControl(controlPlaneClient as Client);

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');
  const noCache = false;

  if (!projectId) {
    throw new CustomError('Project ID is required', 400);
  }

  const key = `secrets:${projectId}`;

  // Try to get cached secrets if caching is enabled
  const [isCached, cachedSecrets] = await Promise.all([
    !noCache && cache.hasItem(key),
    !noCache && cache.getItem(key),
  ]);

  // Return cached secrets if available and caching is enabled
  if (isCached && cachedSecrets) {
    return data(cachedSecrets);
  }

  // Fetch fresh secrets from control plane
  const secrets = await secretsControl.list(projectId);

  // Cache the fresh secrets if caching is enabled
  await cache.setItem(key, secrets).catch((error) => {
    console.error('Failed to cache secrets:', error);
  });
  return data(secrets);
}, authMiddleware);
