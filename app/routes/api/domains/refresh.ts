import { createDomainsControl } from '@/resources/control-plane';
import { BadRequestError, HttpError } from '@/utils/errors';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, data } from 'react-router';

export const ROUTE_PATH = '/api/domains/refresh' as const;

export const action = async ({ request, context }: ActionFunctionArgs) => {
  if (request.method !== 'PATCH') {
    throw new HttpError('Method not allowed', 405);
  }

  try {
    const { controlPlaneClient } = context as AppLoadContext;
    const domainsControl = createDomainsControl(controlPlaneClient as Client);

    const formData = Object.fromEntries(await request.formData());
    const { id, projectId } = formData;

    if (!projectId || !id) {
      throw new BadRequestError('Project ID and domain ID are required');
    }

    await domainsControl.refreshRegistration(projectId as string, id as string, false);

    return data(
      { success: true, message: 'Domain registration refreshed successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    return data({ success: false, error: error.message }, { status: error.status });
  }
};
