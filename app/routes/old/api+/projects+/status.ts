import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { createProjectsControl } from '@/resources/control-plane/projects.control';
import { CustomError } from '@/utils/error';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, data } from 'react-router';

export const ROUTE_PATH = '/api/projects/status' as const;

export const loader = withMiddleware(async ({ request, context }) => {
  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');

    if (!projectId) {
      throw new CustomError('Project ID is required', 400);
    }

    const { controlPlaneClient } = context as AppLoadContext;
    const projectsControl = createProjectsControl(controlPlaneClient as Client);

    const status = await projectsControl.getStatus(projectId);
    return data(status);
  } catch (error) {
    if (error instanceof CustomError) {
      throw error;
    }
    return data(null);
  }
}, authMiddleware);
