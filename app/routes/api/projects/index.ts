import { createProjectsControl } from '@/resources/control-plane';
import { IProjectControlResponse } from '@/resources/interfaces/project.interface';
import { ProjectSchema, projectSchema } from '@/resources/schemas/project.schema';
import { validateCSRF } from '@/utils/cookies';
import { BadRequestError, HttpError } from '@/utils/errors';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, LoaderFunctionArgs, data } from 'react-router';

export const ROUTE_PATH = '/api/projects' as const;

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  try {
    const { controlPlaneClient } = context as AppLoadContext;
    const projectsControl = createProjectsControl(controlPlaneClient as Client);

    const url = new URL(request.url);
    const orgId = url.searchParams.get('orgId');

    if (!orgId) {
      throw new BadRequestError('Organization ID is required');
    }

    // Fetch fresh data from API
    const projects = await projectsControl.list(orgId);

    return data({ success: true, data: projects }, { status: 200 });
  } catch (error: any) {
    return data(
      { success: false, error: error?.message ?? 'An unexpected error occurred' },
      { status: 500 }
    );
  }
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;

  try {
    switch (request.method) {
      case 'POST': {
        const formData = await request.json();
        const { csrf, redirectUri } = formData;

        const csrfFormData = new FormData();
        csrfFormData.append('csrf', csrf);
        await validateCSRF(csrfFormData, request.headers);

        // Validate form data with Zod
        const parsed = projectSchema.safeParse(formData);

        if (!parsed.success) {
          throw new Error('Invalid form data');
        }

        const payload = parsed.data as ProjectSchema;

        const projectControl = createProjectsControl(controlPlaneClient as Client);

        // Dry run to validate
        const validateRes = await projectControl.create(payload, true);

        // If dry run succeeds, create for real
        let project: IProjectControlResponse = {};
        if (validateRes) {
          project = (await projectControl.create(payload)) as IProjectControlResponse;
        }

        return data(
          { success: true, message: 'Project created successfully', data: project },
          { status: 201 }
        );
      }
      default: {
        throw new HttpError('Method not allowed', 405);
      }
    }
  } catch (error: any) {
    return data(
      { success: false, error: error.message || 'An error occurred' },
      { status: error.status || 500 }
    );
  }
};
