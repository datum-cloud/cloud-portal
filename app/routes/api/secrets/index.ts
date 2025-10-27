import { createSecretsControl } from '@/resources/control-plane';
import { secretEditSchema } from '@/resources/schemas/secret.schema';
import { redirectWithToast, validateCSRF } from '@/utils/cookies';
import { BadRequestError, HttpError } from '@/utils/errors';
import { convertLabelsToObject } from '@/utils/helpers/object.helper';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, LoaderFunctionArgs, data } from 'react-router';

export const ROUTE_PATH = '/api/secrets' as const;

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  try {
    const { controlPlaneClient, cache } = context as AppLoadContext;
    const secretsControl = createSecretsControl(controlPlaneClient as Client);

    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    const noCache = false;

    if (!projectId) {
      throw new BadRequestError('Project ID is required');
    }

    const key = `secrets:${projectId}`;

    // Try to get cached secrets if caching is enabled
    const [isCached, cachedSecrets] = await Promise.all([
      !noCache && cache.hasItem(key),
      !noCache && cache.getItem(key),
    ]);

    // Return cached secrets if available and caching is enabled
    if (isCached && cachedSecrets) {
      return data({ success: true, data: cachedSecrets }, { status: 200 });
    }

    // Fetch fresh secrets from control plane
    const secrets = await secretsControl.list(projectId);

    // Cache the fresh secrets if caching is enabled
    await cache.setItem(key, secrets).catch((error) => {
      console.error('Failed to cache secrets:', error);
    });
    return data({ success: true, data: secrets }, { status: 200 });
  } catch (error: any) {
    return data(
      { success: false, error: error?.message ?? 'An unexpected error occurred' },
      { status: 500 }
    );
  }
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  try {
    const secretsControl = createSecretsControl(controlPlaneClient as Client);

    switch (request.method) {
      case 'PATCH': {
        const clonedRequest = request.clone();

        const payload: any = await clonedRequest.json();

        const { projectId, secretId, csrf, action } = payload;

        if (!projectId || !secretId) {
          throw new BadRequestError('Project ID and secret ID are required');
        }

        // Create FormData to validate CSRF token
        const formData = new FormData();
        formData.append('csrf', csrf);

        // Validate the CSRF token against the request headers
        await validateCSRF(formData, request.headers);

        // // Validate form data with Zod
        const parsed = secretEditSchema.safeParse(payload);

        if (!parsed.success) {
          throw new BadRequestError('Invalid form data');
        }

        let body: any = parsed.data;
        if (action === 'metadata') {
          body = {
            metadata: {
              annotations: convertLabelsToObject(body?.annotations ?? []),
              labels: convertLabelsToObject(body?.labels ?? []),
            },
          };
        }

        // First try with dryRun to validate
        const dryRunRes = await secretsControl.update(projectId, secretId, body, true);

        // If dryRun succeeds, update for real
        if (dryRunRes) {
          await secretsControl.update(projectId, secretId, body, false);
        }

        return data({ success: true });
      }
      case 'DELETE': {
        const formData = Object.fromEntries(await request.formData());
        const { secretId, projectId, redirectUri } = formData;

        await secretsControl.delete(projectId as string, secretId as string);

        if (redirectUri) {
          return redirectWithToast(redirectUri as string, {
            title: 'Secret deleted successfully',
            description: 'The secret has been deleted successfully',
            type: 'success',
          });
        }

        return data({ success: true, message: 'Secret deleted successfully' }, { status: 200 });
      }
      default:
        throw new HttpError('Method not allowed', 405);
    }
  } catch (error: any) {
    return data({ success: false, error: error.message }, { status: error.status });
  }
};
