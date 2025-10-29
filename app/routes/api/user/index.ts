import { validateCSRF } from '@/modules/cookie/csrf.server';
import { getSession } from '@/modules/cookie/session.server';
import { createUserControl } from '@/resources/control-plane';
import { userSchema } from '@/resources/schemas/user.schema';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError, HttpError } from '@/utils/errors';
import { Client } from '@hey-api/client-axios';
import {
  ActionFunctionArgs,
  AppLoadContext,
  data,
  redirect,
  LoaderFunctionArgs,
} from 'react-router';

export const ROUTE_PATH = '/api/user' as const;

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  const { session } = await getSession(request);

  if (!session || !session?.sub) {
    return redirect(paths.auth.logOut);
  }

  try {
    const userControl = createUserControl(controlPlaneClient as Client);
    const user = await userControl.detail(session?.sub);

    return data({ success: true, data: user });
  } catch (error: any) {
    return data({ success: false, error: error.message }, { status: error.status || 500 });
  }
};

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
        const parsed = userSchema.safeParse(payload);

        if (!parsed.success) {
          throw new BadRequestError('Invalid form data');
        }

        const res = await userControl.update(session?.sub, parsed.data);

        return data({ success: true, data: res });
      }
      case 'DELETE': {
        await userControl.delete(session?.sub);

        return redirect(paths.auth.logOut);
      }
      default:
        throw new HttpError('Method not allowed', 405);
    }
  } catch (error: any) {
    return data({ success: false, error: error.message }, { status: error.status });
  }
};
