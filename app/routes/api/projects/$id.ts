import { createProjectsControl } from '@/resources/control-plane';
import { updateProjectSchema } from '@/resources/schemas/project.schema';
import { redirectWithToast, setOrgSession, validateCSRF } from '@/utils/cookies';
import { AppError, BadRequestError, HttpError } from '@/utils/errors';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, LoaderFunctionArgs, data } from 'react-router';

export const ROUTE_PATH = '/api/projects/:id' as const;

export const loader = async ({ context, params, request }: LoaderFunctionArgs) => {
  try {
    const { iamResourceClient } = context as AppLoadContext;
    const { id } = params;

    if (!id) {
      throw new BadRequestError('Project ID is required');
    }

    const projectsControl = createProjectsControl(iamResourceClient as Client);
    const project = await projectsControl.detail(id);

    const { headers } = await setOrgSession(request, id);

    return data({ success: true, data: project }, { headers, status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Project not found';
    return data({ success: false, error: errorMessage }, { status: 404 });
  }
};

export const action = async ({ request, context, params }: ActionFunctionArgs) => {
  try {
    const { controlPlaneClient } = context as AppLoadContext;
    const { id } = params;

    if (!id) {
      throw new BadRequestError('Project ID is required');
    }

    const projectsControl = createProjectsControl(controlPlaneClient as Client);
    switch (request.method) {
      case 'DELETE': {
        const formData = Object.fromEntries(await request.formData());

        const { redirectUri, orgId } = formData;

        await projectsControl.delete(orgId as string, id as string);

        if (redirectUri) {
          return redirectWithToast(redirectUri as string, {
            title: 'Project',
            description: 'The project has been deleted successfully',
            type: 'success',
          });
        }

        return data({ success: true, message: 'Project deleted successfully' }, { status: 200 });
      }
      case 'PATCH': {
        const clonedRequest = request.clone();

        const payload: any = await clonedRequest.json();

        const { csrf } = payload;

        // Create FormData to validate CSRF token
        const formData = new FormData();
        formData.append('csrf', csrf);

        // Validate the CSRF token against the request headers
        await validateCSRF(formData, request.headers);

        // Validate form data with Zod
        const parsed = updateProjectSchema.safeParse(payload);

        if (!parsed.success) {
          throw new BadRequestError('Invalid form data');
        }

        const dryRunRes = await projectsControl.update(id, parsed.data, true);

        if (dryRunRes) {
          await projectsControl.update(id, parsed.data, false);
        }

        return data({ success: true, message: 'Project updated successfully' }, { status: 200 });
      }
      default:
        throw new HttpError('Method not allowed', 405);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error || error instanceof AppError
        ? error.message
        : 'An unexpected error occurred';
    return data({ success: false, error: errorMessage }, { status: 500 });
  }
};
