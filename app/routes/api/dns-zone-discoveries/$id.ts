import { createDnsZoneDiscoveriesControl } from '@/resources/control-plane/dns-networking/dns-zone-discoveries.control';
import { BadRequestError } from '@/utils/errors';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, LoaderFunctionArgs, data } from 'react-router';

export const ROUTE_PATH = '/api/dns-zone-discoveries/:id' as const;

/**
 * DNS Zone Discovery Detail API Route
 * Handles read (GET) for a specific DNSZoneDiscovery
 */

export const loader = async ({ params, context, request }: LoaderFunctionArgs) => {
  try {
    const { id } = params;

    if (!id) {
      throw new BadRequestError('DNS Zone Discovery is required');
    }

    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');

    if (!projectId) {
      throw new BadRequestError('Project ID is required');
    }

    const { controlPlaneClient } = context as AppLoadContext;
    const dnsZoneDiscoveriesControl = createDnsZoneDiscoveriesControl(controlPlaneClient as Client);

    const dnsZoneDiscovery = await dnsZoneDiscoveriesControl.detail(projectId, id);

    return data({ success: true, data: dnsZoneDiscovery });
  } catch (error: any) {
    return data(
      { success: false, error: error.message || 'An error occurred' },
      { status: error.status || 500 }
    );
  }
};
