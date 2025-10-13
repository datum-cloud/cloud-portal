import { redirectWithToast } from '@/modules/cookie/toast.server';
import { createPolicyBindingsControl } from '@/resources/control-plane';
import { HttpError } from '@/utils/errors';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, data } from 'react-router';

export const ROUTE_PATH = '/api/policy-bindings' as const;

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  const policyBindingsControl = createPolicyBindingsControl(controlPlaneClient as Client);

  try {
    switch (request.method) {
      case 'DELETE': {
        const formData = Object.fromEntries(await request.formData());
        const { id, orgId, redirectUri } = formData;

        await policyBindingsControl.delete(orgId as string, id as string);

        if (redirectUri) {
          return redirectWithToast(redirectUri as string, {
            title: 'Policy binding deleted successfully',
            description: 'The policy binding has been deleted successfully',
            type: 'success',
          });
        }

        return data(
          { success: true, message: 'Policy binding deleted successfully' },
          { status: 200 }
        );
      }
      default:
        throw new HttpError('Method not allowed', 405);
    }
  } catch (error: any) {
    return data({ success: false, error: error.message }, { status: error.status });
  }
};
