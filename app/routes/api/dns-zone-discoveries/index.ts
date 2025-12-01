import { createDnsZoneDiscoveriesControl } from '@/resources/control-plane/dns-networking/dns-zone-discoveries.control';
import { validateCSRF } from '@/utils/cookies';
import { BadRequestError, HttpError } from '@/utils/errors';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, data } from 'react-router';

export const ROUTE_PATH = '/api/dns-zone-discoveries' as const;

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  try {
    const dnsZoneDiscoveriesControl = createDnsZoneDiscoveriesControl(controlPlaneClient as Client);

    switch (request.method) {
      case 'POST': {
        const formData = await request.json();
        const { projectId, dnsZoneId, csrf } = formData;

        if (!projectId || !dnsZoneId) {
          throw new BadRequestError('Project ID and DNS Zone ID are required');
        }

        const csrfFormData = new FormData();
        csrfFormData.append('csrf', csrf);
        await validateCSRF(csrfFormData, request.headers);

        const dryRunRes = await dnsZoneDiscoveriesControl.create(projectId, dnsZoneId, true);

        if (dryRunRes) {
          await dnsZoneDiscoveriesControl.create(projectId, dnsZoneId, false);
        }

        return data(
          { success: true, message: 'DNS Zone Discovery created successfully' },
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
