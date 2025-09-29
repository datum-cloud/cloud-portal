import { ExportPolicyStepperForm } from '@/features/observe/export-policies/form/stepper-form';
import { validateCSRF } from '@/modules/cookie/csrf.server';
import { dataWithToast } from '@/modules/cookie/toast.server';
import { createExportPoliciesControl } from '@/resources/control-plane';
import { newExportPolicySchema } from '@/resources/schemas/export-policy.schema';
import { paths } from '@/utils/config/paths.config';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Client } from '@hey-api/client-axios';
import {
  ActionFunctionArgs,
  AppLoadContext,
  MetaFunction,
  redirect,
  useParams,
} from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('New Export Policy');
});

export const action = async ({ request, context, params }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  const { projectId } = params;

  const exportPoliciesControl = createExportPoliciesControl(controlPlaneClient as Client);

  if (!projectId) {
    throw new Error('Project ID is required');
  }

  const clonedRequest = request.clone();

  const payload: any = await clonedRequest.json();

  try {
    // Extract CSRF token from JSON payload
    const csrfToken = payload.csrf;

    // Create FormData to validate CSRF token
    const formData = new FormData();
    formData.append('csrf', csrfToken);

    // Validate the CSRF token against the request headers
    await validateCSRF(formData, request.headers);

    const parsed = newExportPolicySchema.safeParse(payload);

    if (!parsed.success) {
      throw new Error('Invalid form data');
    }

    const dryRunRes = await exportPoliciesControl.create(projectId, parsed.data, true);

    if (dryRunRes) {
      await exportPoliciesControl.create(projectId, parsed.data, false);
    }

    return redirect(
      getPathWithParams(paths.project.detail.metrics.exportPolicies.detail.root, {
        projectId,
        exportPolicyId: parsed.data.metadata.name,
      })
    );
  } catch (error) {
    return dataWithToast(null, {
      title: 'Error',
      description: error instanceof Error ? error.message : (error as Response).statusText,
      type: 'error',
    });
  }
};

export default function ExportPoliciesNewPage() {
  const { projectId } = useParams();
  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <ExportPolicyStepperForm projectId={projectId} />
    </div>
  );
}
