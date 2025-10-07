import { createResourceGrantsControl } from '@/resources/control-plane/quota/resourcegrants.control';
import { Client } from '@hey-api/client-axios';
import { LoaderFunctionArgs, AppLoadContext } from 'react-router';

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { orgId } = params;

  if (!orgId) {
    throw new Error('Organization ID is required');
  }

  const { controlPlaneClient } = context as AppLoadContext;
  const resourceGrantsControl = createResourceGrantsControl(controlPlaneClient as Client);
  const resourceGrants = await resourceGrantsControl.list(orgId);
  return resourceGrants;
};
export default function OrgSettingsUsagePage() {
  return <div>OrgSettingsUsagePage</div>;
}
