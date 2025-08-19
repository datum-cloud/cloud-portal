import { createLocationsControl } from '@/resources/control-plane/locations.control';
import { BadRequestError } from '@/utils/errors';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, LoaderFunctionArgs, data } from 'react-router';

export const ROUTE_PATH = '/api/locations' as const;

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');

  if (!projectId) {
    throw new BadRequestError('Project ID is required');
  }

  const { controlPlaneClient } = context as AppLoadContext;
  const locationsControl = createLocationsControl(controlPlaneClient as Client);

  const locations = await locationsControl.list(projectId);
  return data({ success: true, data: locations }, { status: 200 });
};
