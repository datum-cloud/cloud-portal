import { routes } from '@/constants/routes';
import { iamOrganizationsAPI } from '@/resources/api/iam/organizations.api';
import { dataWithToast, redirectWithToast } from '@/utils/cookies/toast';
import { CustomError } from '@/utils/errorHandle';
import { authMiddleware } from '@/utils/middleware/auth.middleware';
import { withMiddleware } from '@/utils/middleware/middleware';
import { AxiosInstance } from 'axios';
import { AppLoadContext, data } from 'react-router';

export const ROUTE_PATH = '/api/organizations/:orgId' as const;

export const loader = withMiddleware(async ({ context, params }) => {
  const { apiClient } = context as AppLoadContext;
  const { orgId } = params;

  if (!orgId) {
    throw new CustomError('Organization ID is required', 400);
  }

  const orgAPI = iamOrganizationsAPI(apiClient as AxiosInstance);
  const org = await orgAPI.detail(orgId);

  return data(org);
}, authMiddleware);

export const action = withMiddleware(async ({ request, context, params }) => {
  const { apiClient } = context as AppLoadContext;
  const { orgId } = params;

  if (!orgId) {
    throw new CustomError('Organization ID is required', 400);
  }

  const orgAPI = iamOrganizationsAPI(apiClient as AxiosInstance);

  try {
    switch (request.method) {
      case 'DELETE': {
        await orgAPI.delete(orgId);

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
