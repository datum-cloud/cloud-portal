import { createDomainsControl } from '@/resources/control-plane';
import { IDomainControlResponse } from '@/resources/interfaces/domain.interface';
import { redirectWithToast, validateCSRF } from '@/utils/cookies';
import { HttpError } from '@/utils/errors';
import { generateId } from '@/utils/helpers/text.helper';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, data } from 'react-router';

export const ROUTE_PATH = '/api/domains' as const;

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  try {
    const domainsControl = createDomainsControl(controlPlaneClient as Client);

    switch (request.method) {
      case 'DELETE': {
        const formData = Object.fromEntries(await request.formData());
        const { id, projectId, redirectUri } = formData;

        if (!projectId || !id) {
          return data(
            { success: false, error: 'Project ID and domain ID are required' },
            { status: 400 }
          );
        }

        await domainsControl.delete(projectId as string, id as string);

        if (redirectUri) {
          return redirectWithToast(redirectUri as string, {
            title: 'Domain deleted successfully',
            description: 'The domain has been deleted successfully',
            type: 'success',
          });
        }

        return data({ success: true, message: 'Domain deleted successfully' }, { status: 200 });
      }
      case 'POST': {
        const body = await request.json();

        const { domain, projectId, csrf } = body;

        if (!projectId || !domain) {
          return data(
            { success: false, error: 'Project ID and domain are required' },
            { status: 400 }
          );
        }

        const csrfFormData = new FormData();
        csrfFormData.append('csrf', csrf);
        await validateCSRF(csrfFormData, request.headers);

        const payload = {
          domainName: domain as string,
          name: generateId(domain as string, { randomLength: 0 }),
        };

        const dryRunRes = await domainsControl.create(projectId as string, payload, true);

        let res: IDomainControlResponse = {};
        if (dryRunRes) {
          res = await domainsControl.create(projectId as string, payload, false);
        }

        return data(
          { success: true, message: 'Domain created successfully', data: res },
          { status: 201 }
        );
      }
      default:
        throw new HttpError('Method not allowed', 405);
    }
  } catch (error: any) {
    return data({ success: false, error: error.message }, { status: error.status });
  }
};
