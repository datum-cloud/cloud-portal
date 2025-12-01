import { createOrganizationsControl } from '@/resources/control-plane';
import { OrganizationSchema, organizationSchema } from '@/resources/schemas/organization.schema';
import { validateCSRF } from '@/utils/cookies';
import { HttpError } from '@/utils/errors';
import { Client } from '@hey-api/client-axios';
import {
  ActionFunctionArgs,
  AppLoadContext,
  LoaderFunctionArgs,
  data,
  redirect,
} from 'react-router';

export const ROUTE_PATH = '/api/organizations' as const;

export const loader = async ({ context }: LoaderFunctionArgs) => {
  const { iamResourceClient } = context as AppLoadContext;

  try {
    // get default organization
    const orgAPI = createOrganizationsControl(iamResourceClient as Client);
    const organizations = await orgAPI.list();

    // await cache.setItem('organizations', organizations);
    return data({ success: true, data: organizations });
  } catch (error) {
    return data(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
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
        const parsed = organizationSchema.safeParse(formData);

        if (!parsed.success) {
          throw new Error('Invalid form data');
        }

        const payload = parsed.data as OrganizationSchema;

        const orgControl = createOrganizationsControl(controlPlaneClient as Client);

        // Dry run to validate
        const validateRes = await orgControl.create(payload, true);

        // If dry run succeeds, create for real
        if (validateRes) {
          await orgControl.create(payload);
        }

        if (redirectUri) {
          return redirect(redirectUri as string);
        }

        return data(
          { success: true, message: 'Organization created successfully' },
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
