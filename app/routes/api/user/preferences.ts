import { paths } from '@/config/paths';
import { validateCSRF } from '@/modules/cookie/csrf.server';
import { getSession } from '@/modules/cookie/session.server';
import { createUserControl } from '@/resources/control-plane/user.control';
import { userPreferencesSchema } from '@/resources/schemas/user.schema';
import { CustomError } from '@/utils/error';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, data, redirect } from 'react-router';

export const ROUTE_PATH = '/api/user/preferences' as const;

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  const { session } = await getSession(request);

  if (!session || !session?.sub) {
    return redirect(paths.auth.logOut);
  }

  try {
    const userControl = createUserControl(controlPlaneClient as Client);

    switch (request.method) {
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
        const parsed = userPreferencesSchema.safeParse(payload);

        if (!parsed.success) {
          throw new CustomError('Invalid form data', 400);
        }

        const res = await userControl.updatePreferences(session?.sub, parsed.data);

        return data({ success: true, data: res });
      }
      default:
        throw new CustomError('Method not allowed', 405);
    }
  } catch (error: any) {
    return data({ success: false, error: error.message }, { status: error.status });
  }
};
