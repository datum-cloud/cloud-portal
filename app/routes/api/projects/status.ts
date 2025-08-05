import { createProjectsControl } from '@/resources/control-plane/projects.control';
import { CustomError } from '@/utils/error';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, LoaderFunctionArgs, data } from 'react-router';

export const ROUTE_PATH = '/api/projects/:id/status' as const;

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  try {
    const { id } = params;

    if (!id) {
      throw new CustomError('Project ID is required', 400);
    }

    const { controlPlaneClient } = context as AppLoadContext;
    const projectsControl = createProjectsControl(controlPlaneClient as Client);

    const status = await projectsControl.getStatus(id);
    return data({ success: true, data: status }, { status: 200 });
  } catch (error: any) {
    return data(
      { success: false, error: error?.message ?? 'An unexpected error occurred' },
      { status: 500 }
    );
  }
};
