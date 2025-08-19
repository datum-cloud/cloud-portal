import { validateCSRF } from '@/modules/cookie/csrf.server';
import { redirectWithToast } from '@/modules/cookie/toast.server';
import { createNetworksControl } from '@/resources/control-plane/networks.control';
import { INetworkControlResponse } from '@/resources/interfaces/network.interface';
import {
  NewNetworkSchema,
  newNetworkSchema,
  UpdateNetworkSchema,
  updateNetworkSchema,
} from '@/resources/schemas/network.schema';
import { AppError, BadRequestError, HttpError } from '@/utils/errors';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, LoaderFunctionArgs, data } from 'react-router';

export const ROUTE_PATH = '/api/networks' as const;

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const { controlPlaneClient, cache } = context as AppLoadContext;
  const networksControl = createNetworksControl(controlPlaneClient as Client);

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');
  const noCache = url.searchParams.get('noCache');

  if (!projectId) {
    throw new BadRequestError('Project ID is required');
  }

  const key = `networks:${projectId}`;

  const [isCached, cachedNetworks] = await Promise.all([
    !noCache && cache.hasItem(key),
    !noCache && cache.getItem(key),
  ]);

  if (isCached && cachedNetworks) {
    return data({ success: true, data: cachedNetworks }, { status: 200 });
  }

  const networks = await networksControl.list(projectId);

  await cache.setItem(key, networks).catch((error) => {
    console.error('Failed to cache networks:', error);
  });
  return data({ success: true, data: networks }, { status: 200 });
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  const networksControl = createNetworksControl(controlPlaneClient as Client);

  try {
    switch (request.method) {
      case 'POST': {
        const clonedRequest = request.clone();
        const payload: any = await clonedRequest.json();
        const { projectId } = payload;

        if (!projectId) {
          throw new BadRequestError('Project ID is required');
        }

        const csrfToken = payload?.csrf;
        const formData = new FormData();
        formData.append('csrf', csrfToken);
        await validateCSRF(formData, request.headers);

        const parsed = newNetworkSchema.safeParse(payload);
        if (!parsed.success) {
          throw new BadRequestError('Invalid form data');
        }

        const formattedPayload = parsed.data as NewNetworkSchema;
        const dryRunRes = await networksControl.create(projectId as string, formattedPayload, true);

        let res: INetworkControlResponse | undefined;
        if (dryRunRes) {
          res = (await networksControl.create(
            projectId as string,
            formattedPayload,
            false
          )) as INetworkControlResponse;
        }

        return data({ success: true, data: res }, { status: 200 });
      }
      case 'PUT': {
        const clonedRequest = request.clone();
        const payload: any = await clonedRequest.json();
        const { projectId, networkId } = payload;

        if (!projectId || !networkId) {
          throw new BadRequestError('Project ID and Network ID are required');
        }

        const csrfToken = payload?.csrf;
        const formData = new FormData();
        formData.append('csrf', csrfToken);
        await validateCSRF(formData, request.headers);

        const parsed = updateNetworkSchema.safeParse(payload);
        if (!parsed.success) {
          throw new BadRequestError('Invalid form data');
        }

        const formattedPayload = parsed.data as UpdateNetworkSchema;
        const dryRunRes = await networksControl.update(
          projectId,
          networkId,
          formattedPayload,
          true
        );

        let res: INetworkControlResponse | undefined;
        if (dryRunRes) {
          res = (await networksControl.update(
            projectId,
            networkId,
            formattedPayload,
            false
          )) as INetworkControlResponse;
        }

        return data(
          { success: true, data: res },
          {
            status: 200,
          }
        );
      }
      case 'DELETE': {
        const formData = Object.fromEntries(await request.formData());
        const { networkId, projectId, redirectUrl } = formData;

        await networksControl.delete(projectId as string, networkId as string);

        if (redirectUrl) {
          return redirectWithToast(redirectUrl as string, {
            title: 'Network deleted successfully',
            description: 'The network has been deleted successfully',
            type: 'success',
          });
        }

        return data({ success: true, message: 'Network deleted successfully' }, { status: 200 });
      }
      default:
        throw new HttpError('Method not allowed', 405);
    }
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return error.toResponse();
    }
    return new HttpError('An unexpected error occurred').toResponse();
  }
};
