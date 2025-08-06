import { createDomainsControl } from '@/resources/control-plane/domains.control';
import { CustomError } from '@/utils/error';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, LoaderFunctionArgs, data } from 'react-router';

export const ROUTE_PATH = '/api/domains/:id/status' as const;

export const loader = async ({ params, context, request }: LoaderFunctionArgs) => {
  try {
    const { id } = params;

    if (!id) {
      throw new CustomError('Domain ID is required', 400);
    }

    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');

    if (!projectId) {
      throw new CustomError('Project ID is required', 400);
    }

    const { controlPlaneClient } = context as AppLoadContext;
    const domainsControl = createDomainsControl(controlPlaneClient as Client);

    const status = await domainsControl.getStatus(projectId, id);
    return data({ success: true, data: status }, { status: 200 });
  } catch (error: any) {
    return data(
      { success: false, error: error?.message ?? 'An unexpected error occurred' },
      { status: 500 }
    );
  }
};
