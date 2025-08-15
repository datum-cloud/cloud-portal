import { createLocationsControl } from '@/resources/control-plane/locations.control';
import { CustomError } from '@/utils/error';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, LoaderFunctionArgs, data } from 'react-router';

export const ROUTE_PATH = '/api/locations' as const;

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');

  if (!projectId) {
    throw new CustomError('Project ID is required', 400);
  }

  const { controlPlaneClient } = context as AppLoadContext;
  const locationsControl = createLocationsControl(controlPlaneClient as Client);

  const locations = await locationsControl.list(projectId);
  return data({ success: true, data: locations }, { status: 200 });
};
