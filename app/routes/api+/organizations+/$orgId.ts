import { routes } from '@/constants/routes';
import { dataWithToast, redirectWithToast } from '@/modules/cookie/toast.server';
import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { createOrganizationsControl } from '@/resources/control-plane/organizations.control';
import { IOrganization } from '@/resources/interfaces/organization.interface';
import { CustomError } from '@/utils/errorHandle';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, data } from 'react-router';

export const ROUTE_PATH = '/api/organizations/:orgId' as const;

export const loader = withMiddleware(async ({ context, params }) => {
  const { iamResourceClient, cache } = context as AppLoadContext;
  const { orgId } = params;

  if (!orgId) {
    throw new CustomError('Organization ID is required', 400);
  }

  const key = `organizations:${orgId}`;

  const isCached = await cache.hasItem(key);
  if (isCached) {
    const org = await cache.getItem(key);
    return data(org);
  }

  const orgAPI = createOrganizationsControl(iamResourceClient as Client);
  const org = await orgAPI.detail(orgId);

  await cache.setItem(key, org);

  return data(org);
}, authMiddleware);

export const action = withMiddleware(async ({ request, context, params }) => {
  const { controlPlaneClient, cache } = context as AppLoadContext;
  const { orgId } = params;

  if (!orgId) {
    throw new CustomError('Organization ID is required', 400);
  }

  const orgAPI = createOrganizationsControl(controlPlaneClient as Client);

  try {
    switch (request.method) {
      case 'DELETE': {
        await orgAPI.delete(orgId);
        await cache.removeItem(`organizations:${orgId}`);

        const organizations = await cache.getItem('organizations');

        if (organizations) {
          const filtered = (organizations as IOrganization[]).filter(
            (org: IOrganization) => org.name !== orgId
          );
          await cache.setItem('organizations', filtered);
        }

        return redirectWithToast(routes.account.organizations.root, {
          title: 'Organization deleted successfully',
          description: 'You have successfully deleted an organization.',
          type: 'success',
        });
      }
      default:
        throw new Error('Method not allowed');
    }
  } catch (error) {
    return dataWithToast(null, {
      title: 'Error',
      description: error instanceof Error ? error.message : (error as Response).statusText,
      type: 'error',
    });
  }
}, authMiddleware);
