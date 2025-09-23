import { PolicyBindingsTable } from '@/features/policy-binding/policy-bindings-table';
import { createPolicyBindingsControl } from '@/resources/control-plane/policy-bindings.control';
import { BadRequestError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, LoaderFunctionArgs, MetaFunction, useLoaderData } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Policy Bindings');
});

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId } = params;
  const { controlPlaneClient } = context as AppLoadContext;
  const policyBindingsControl = createPolicyBindingsControl(controlPlaneClient as Client);

  if (!projectId) {
    throw new BadRequestError('Project ID is required');
  }

  const bindings = await policyBindingsControl.list({ type: 'project', id: projectId });
  return bindings;
};

export default function PolicyBindingsPage() {
  const data = useLoaderData<typeof loader>();

  return <PolicyBindingsTable data={data ?? []} />;
}
