import { CloudValidService } from '@/modules/cloudvalid';
import { BadRequestError, HttpError } from '@/utils/errors';
import { ActionFunctionArgs, data } from 'react-router';

export const ROUTE_PATH = '/api/cloudvalid/dns' as const;

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    switch (request.method) {
      case 'POST': {
        const formData = Object.fromEntries(await request.formData());
        const { domain, dnsName, dnsContent, redirectUri } = formData;

        if (!domain || !dnsName || !dnsContent) {
          throw new BadRequestError('Missing required fields');
        }

        const cloudValidService = new CloudValidService(process.env.CLOUDVALID_API_KEY ?? '');
        const dnsSetup = await cloudValidService.createDNSSetup({
          domain: domain as string,
          template_id: process.env.CLOUDVALID_TEMPLATE_ID,
          variables: {
            dnsRecordName: dnsName as string,
            dnsRecordContent: dnsContent as string,
          },
          redirect_url: (redirectUri ?? '') as string,
        });

        return data({ success: true, data: dnsSetup.result }, { status: 200 });
      }
      default:
        throw new HttpError('Method not allowed', 405);
    }
  } catch (error: any) {
    return data({ success: false, error: error.message }, { status: error.status });
  }
};
