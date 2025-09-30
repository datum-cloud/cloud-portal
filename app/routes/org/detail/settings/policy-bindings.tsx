import { PolicyBindingsTable } from '@/features/organization';
import { withMiddleware, standardOrgMiddleware } from '@/modules/middleware/';
import { createPolicyBindingsControl } from '@/resources/control-plane';
import { IPolicyBindingControlResponse } from '@/resources/interfaces/policy-binding.interface';
import { BadRequestError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, LoaderFunctionArgs, MetaFunction, useLoaderData } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Policy Bindings');
});

export const loader = withMiddleware(async ({ context, params }: LoaderFunctionArgs) => {
  const { orgId } = params;
  const { controlPlaneClient } = context as AppLoadContext;
  const policyBindingsControl = createPolicyBindingsControl(controlPlaneClient as Client);

  if (!orgId) {
    throw new BadRequestError('Organization ID is required');
  }

  const bindings = await policyBindingsControl.list(orgId);
  return bindings;
}, standardOrgMiddleware);

export default function OrgPolicyBindingsPage() {
  const bindings = useLoaderData<typeof loader>() as IPolicyBindingControlResponse[];

  return <PolicyBindingsTable bindings={bindings ?? []} />;
}
