import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { iamOrganizationsAPI } from '@/resources/api/iam/organizations.api';
import { CustomError } from '@/utils/errorHandle';
import { AxiosInstance } from 'axios';
import { AppLoadContext, data } from 'react-router';

export const ROUTE_PATH = '/api/organizations' as const;

export const loader = withMiddleware(async ({ context }) => {
  const { apiClient } = context as AppLoadContext;

  try {
    const orgAPI = iamOrganizationsAPI(apiClient as AxiosInstance);
    const organizations = await orgAPI.list();

    return data({ success: true, data: organizations });
  } catch (error) {
    return data({ success: false, error: (error as CustomError).statusText });
  }
}, authMiddleware);
