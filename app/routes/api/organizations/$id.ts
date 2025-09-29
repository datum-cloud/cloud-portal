import { setOrgSession } from '@/modules/cookie/org.server';
import { createOrganizationsControl } from '@/resources/control-plane';
import { IOrganization } from '@/resources/interfaces/organization.interface';
import { AppError, BadRequestError, HttpError } from '@/utils/errors';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, LoaderFunctionArgs, data } from 'react-router';

export const ROUTE_PATH = '/api/organizations/:id' as const;

export const loader = async ({ context, params, request }: LoaderFunctionArgs) => {
  try {
    const { iamResourceClient, cache } = context as AppLoadContext;
    const { id } = params;

    if (!id) {
      throw new BadRequestError('Organization ID is required');
    }

    const key = `organizations:${id}`;

    const isCached = await cache.hasItem(key);
    if (isCached) {
      const org = await cache.getItem(key);

      const { headers } = await setOrgSession(request, id);
      return data({ success: true, data: org }, { headers, status: 200 });
    }

    const orgAPI = createOrganizationsControl(iamResourceClient as Client);
    const org = await orgAPI.detail(id);

    const { headers } = await setOrgSession(request, id);

    await cache.setItem(key, org);

    return data({ success: true, data: org }, { headers, status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Organization not found';
    return data({ success: false, error: errorMessage }, { status: 404 });
  }
};

export const action = async ({ request, context, params }: ActionFunctionArgs) => {
  try {
    const { controlPlaneClient, cache } = context as AppLoadContext;
    const { id } = params;

    if (!id) {
      throw new BadRequestError('Organization ID is required');
    }

    const orgAPI = createOrganizationsControl(controlPlaneClient as Client);
    switch (request.method) {
      case 'DELETE': {
        await orgAPI.delete(id);
        await cache.removeItem(`organizations:${id}`);

        const organizations = await cache.getItem('organizations');

        if (organizations) {
          const filtered = (organizations as IOrganization[]).filter(
            (org: IOrganization) => org.name !== id
          );
          await cache.setItem('organizations', filtered);
        }

        return data(
          { success: true, message: 'Organization deleted successfully' },
          { status: 200 }
        );
      }
      default:
        throw new HttpError('Method not allowed', 405);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error || error instanceof AppError
        ? error.message
        : 'An unexpected error occurred';
    return data({ success: false, error: errorMessage }, { status: 500 });
  }
};
