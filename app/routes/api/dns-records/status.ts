import { createDnsRecordSetsControl } from '@/resources/control-plane';
import { BadRequestError } from '@/utils/errors';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, LoaderFunctionArgs, data } from 'react-router';

export const ROUTE_PATH = '/api/dns-records/:id/status' as const;

export const loader = async ({ params, context, request }: LoaderFunctionArgs) => {
  try {
    const { id } = params;

    if (!id) {
      throw new BadRequestError('DNS Record ID is required');
    }

    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');

    if (!projectId) {
      throw new BadRequestError('Project ID and DNS Record ID are required');
    }

    const { controlPlaneClient } = context as AppLoadContext;
    const dnsRecordSetsControl = createDnsRecordSetsControl(controlPlaneClient as Client);

    const status = await dnsRecordSetsControl.getStatus(projectId, id);
    return data({ success: true, data: status }, { status: 200 });
  } catch (error: any) {
    return data(
      { success: false, error: error?.message ?? 'An unexpected error occurred' },
      { status: 500 }
    );
  }
};
