import { paths } from '@/config/paths';
import { validateCSRF } from '@/modules/cookie/csrf.server';
import { dataWithToast, redirectWithToast } from '@/modules/cookie/toast.server';
import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { createNetworksControl } from '@/resources/control-plane/networks.control';
import { INetworkControlResponse } from '@/resources/interfaces/network.interface';
import {
  NewNetworkSchema,
  newNetworkSchema,
  UpdateNetworkSchema,
  updateNetworkSchema,
} from '@/resources/schemas/network.schema';
import { CustomError } from '@/utils/error';
import { getPathWithParams } from '@/utils/path';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext } from 'react-router';

export const ROUTE_PATH = '/api/connect/networks/actions' as const;

export const action = withMiddleware(async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  const networksControl = createNetworksControl(controlPlaneClient as Client);

  try {
    switch (request.method) {
      case 'POST': {
        const clonedRequest = request.clone();

        const payload: any = await clonedRequest.json();

        const { projectId } = payload;

        if (!projectId) {
          throw new CustomError('Project ID is required', 400);
        }

        // Extract CSRF token from JSON payload
        const csrfToken = payload?.csrf;

        // Create FormData to validate CSRF token
        const formData = new FormData();
        formData.append('csrf', csrfToken);

        // Validate the CSRF token against the request headers
        await validateCSRF(formData, request.headers);

        const parsed = newNetworkSchema.safeParse(payload);

        if (!parsed.success) {
          throw new CustomError('Invalid form data', 400);
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

        return dataWithToast(
          { success: true, data: res },
          {
            title: 'Network created successfully',
            description: 'You have successfully created a network.',
            type: 'success',
          }
        );
      }
      case 'PUT': {
        const clonedRequest = request.clone();

        const payload: any = await clonedRequest.json();

        const { projectId } = payload;

        if (!projectId) {
          throw new CustomError('Project ID is required', 400);
        }

        // Extract CSRF token from JSON payload
        const csrfToken = payload?.csrf;

        // Create FormData to validate CSRF token
        const formData = new FormData();
        formData.append('csrf', csrfToken);

        // Validate the CSRF token against the request headers
        await validateCSRF(formData, request.headers);

        const { networkId } = payload;

        if (!networkId) {
          throw new CustomError('Network ID is required', 400);
        }

        const parsed = updateNetworkSchema.safeParse(payload);

        if (!parsed.success) {
          throw new CustomError('Invalid form data', 400);
        }

        const formattedPayload = parsed.data as UpdateNetworkSchema;
        // First try with dryRun to validate
        const dryRunRes = await networksControl.update(
          projectId,
          networkId,
          formattedPayload,
          true
        );

        // If dryRun succeeds, update for real
        let res: INetworkControlResponse | undefined;
        if (dryRunRes) {
          res = (await networksControl.update(
            projectId,
            networkId,
            formattedPayload,
            false
          )) as INetworkControlResponse;
        }

        return dataWithToast(
          { success: true, data: res },
          {
            title: 'Network updated successfully',
            description: 'You have successfully updated a network.',
            type: 'success',
          }
        );
      }
      case 'DELETE': {
        const formData = Object.fromEntries(await request.formData());
        const { networkId, projectId, orgId } = formData;

        await networksControl.delete(projectId as string, networkId as string);
        return redirectWithToast(
          getPathWithParams(paths.projects.connect.networks.root, {
            orgId: orgId as string,
            projectId: projectId as string,
          }),
          {
            title: 'Network deleted successfully',
            description: 'The network has been deleted successfully',
            type: 'success',
          }
        );
      }
      default:
        throw new CustomError('Method not allowed', 405);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : (error as Response).statusText;
    return dataWithToast(
      { success: false, message },
      {
        title: 'An error occurred',
        description: message,
        type: 'error',
      }
    );
  }
}, authMiddleware);
