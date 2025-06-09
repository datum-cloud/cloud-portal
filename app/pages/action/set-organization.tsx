import { iamOrganizationsAPI } from '@/resources/api/iam/organizations.api';
import { organizationCookie } from '@/utils/cookies';
import { ValidationError } from '@/utils/errors';
import { validateCSRF } from '@/utils/helpers/csrf.helper';
import { authMiddleware } from '@/utils/middleware/auth.middleware';
import { withMiddleware } from '@/utils/middleware/middleware';
import { AxiosInstance } from 'axios';
import { ActionFunctionArgs, AppLoadContext, data } from 'react-router';

export const action = withMiddleware(async ({ request, context }: ActionFunctionArgs) => {
  const { apiClient } = context as AppLoadContext;

  const clonedRequest = request.clone();
  const formData = await clonedRequest.formData();

  if (!formData.get('id')) {
    throw new ValidationError('Organization ID is required');
  }

  // Validate CSRF Token
  await validateCSRF(formData, clonedRequest.headers);

  // Get Organization by Name
  const orgApi = iamOrganizationsAPI(apiClient as AxiosInstance);
  const org = await orgApi.detail(formData.get('id') as string);

  // Set Organization in Session
  await organizationCookie.set(request, { id: org.id ?? null });

  return data(org);
}, authMiddleware);
