import { PolicyBindingForm } from '@/features/policy-binding';
import { createPolicyBindingsControl } from '@/resources/control-plane';
import { newPolicyBindingSchema } from '@/resources/schemas/policy-binding.schema';
import { paths } from '@/utils/config/paths.config';
import { dataWithToast, redirectWithToast, validateCSRF } from '@/utils/cookies';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { parseWithZod } from '@conform-to/zod/v4';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, MetaFunction } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('New Policy Binding');
});

export const action = async ({ request, params, context }: ActionFunctionArgs) => {
  const { orgId } = params;

  if (!orgId) {
    throw new Error('Organization ID is required');
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

    const dryRunRes = await policyBindingsControl.create(orgId, parsed.value, true);

    if (dryRunRes) {
      await policyBindingsControl.create(orgId, parsed.value, false);
    }

    return redirectWithToast(
      getPathWithParams(paths.org.detail.policyBindings.root, {
        orgId,
      }),
      {
        title: 'Policy binding created successfully',
        description: 'You have successfully created a policy binding.',
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

export default function OrgPolicyBindingsNewPage() {
  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <PolicyBindingForm />
    </div>
  );
}
