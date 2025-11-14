import { createDnsZonesControl } from '@/resources/control-plane/dns-networking';
import { formDnsZoneSchema } from '@/resources/schemas/dns-zone.schema';
import { redirectWithToast, validateCSRF } from '@/utils/cookies';
import { BadRequestError, HttpError } from '@/utils/errors';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, data } from 'react-router';

export const ROUTE_PATH = '/api/dns-zones' as const;

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  try {
    const dnsZonesControl = createDnsZonesControl(controlPlaneClient as Client);

    switch (request.method) {
      case 'PATCH': {
        const clonedRequest = request.clone();

        const payload: any = await clonedRequest.json();

        const { csrf, projectId, id } = payload;

        if (!projectId || !id) {
          throw new BadRequestError('Project ID and DNS Zone ID are required');
        }

        // Create FormData to validate CSRF token
        const formData = new FormData();
        formData.append('csrf', csrf);

        // Validate the CSRF token against the request headers
        await validateCSRF(formData, request.headers);

        // Validate form data with Zod
        const parsed = formDnsZoneSchema.safeParse(payload);

        if (!parsed.success) {
          throw new BadRequestError('Invalid form data');
        }

        const dryRunRes = await dnsZonesControl.update(
          projectId as string,
          id as string,
          parsed.data,
          true
        );

        if (dryRunRes) {
          await dnsZonesControl.update(projectId as string, id as string, parsed.data, false);
        }

        return data({ success: true });
      }
      case 'DELETE': {
        const formData = Object.fromEntries(await request.formData());
        const { id, projectId, redirectUri } = formData;

        await dnsZonesControl.delete(projectId as string, id as string);

        if (redirectUri) {
          return redirectWithToast(redirectUri as string, {
            title: 'DNS Zone deleted successfully',
            description: 'The DNS Zone has been deleted successfully',
            type: 'success',
          });
        }

        return data({ success: true, message: 'DNS Zone deleted successfully' }, { status: 200 });
      }
      default:
        throw new HttpError('Method not allowed', 405);
    }
  } catch (error: any) {
    return data({ success: false, error: error.message }, { status: error.status });
  }
};
