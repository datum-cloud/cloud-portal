import { PolicyBindingForm } from '@/features/policy-binding';
import { createPolicyBindingsControl } from '@/resources/control-plane/iam/policy-bindings.control';
import { IPolicyBindingControlResponse } from '@/resources/interfaces/policy-binding.interface';
import { newPolicyBindingSchema } from '@/resources/schemas/policy-binding.schema';
import { paths } from '@/utils/config/paths.config';
import { dataWithToast, redirectWithToast, validateCSRF } from '@/utils/cookies';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { parseWithZod } from '@conform-to/zod/v4';
import { Client } from '@hey-api/client-axios';
import {
  ActionFunctionArgs,
  AppLoadContext,
  LoaderFunctionArgs,
  MetaFunction,
  data,
  useLoaderData,
} from 'react-router';

export const handle = {
  breadcrumb: () => <span>Edit</span>,
};

export const meta: MetaFunction<typeof loader> = mergeMeta(({ loaderData }) => {
  const policy = loaderData as IPolicyBindingControlResponse;
  return metaObject(policy?.name || 'Policy Binding');
});

export const action = async ({ context, params, request }: ActionFunctionArgs) => {
  const { orgId, policyBindingId } = params;

  if (!orgId || !policyBindingId) {
    throw new BadRequestError('Organization ID and policy binding ID are required');
  }

  const clonedRequest = request.clone();
  const formData = await clonedRequest.formData();

  try {
    await validateCSRF(formData, clonedRequest.headers);

    const parsed = parseWithZod(formData, { schema: newPolicyBindingSchema });

    if (parsed.status !== 'success') {
      throw new Error('Invalid form data');
    }
    const { controlPlaneClient } = context as AppLoadContext;
    const policyBindingsControl = createPolicyBindingsControl(controlPlaneClient as Client);

    const dryRunRes = await policyBindingsControl.update(
      orgId,
      policyBindingId,
      parsed.value,
      true
    );

    if (dryRunRes) {
      await policyBindingsControl.update(orgId, policyBindingId, parsed.value, false);
    }

    return redirectWithToast(
      getPathWithParams(paths.org.detail.policyBindings.root, {
        orgId,
      }),
      {
        title: 'Policy binding updated successfully',
        description: 'You have successfully updated a policy binding.',
        type: 'success',
      }
    );
  } catch (error) {
    return dataWithToast(null, {
      title: 'Error',
      description: error instanceof Error ? error.message : (error as Response).statusText,
      type: 'error',
    });
  }
};

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { orgId, policyBindingId } = params;
  const { controlPlaneClient } = context as AppLoadContext;

  if (!orgId || !policyBindingId) {
    throw new BadRequestError('Project ID and export policy ID are required');
  }

  const policyBindingsControl = createPolicyBindingsControl(controlPlaneClient as Client);

  const policyBinding = await policyBindingsControl.detail(orgId, policyBindingId);

  if (!policyBinding) {
    throw new NotFoundError('ExportPolicy not found');
  }

  return data(policyBinding);
};

export default function OrgPolicyBindingEditPage() {
  const policyBinding = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <PolicyBindingForm defaultValue={policyBinding} />
    </div>
  );
}
