import { ExportPolicyUpdateForm } from '@/features/observe/export-policies/form/update-form';
import { validateCSRF } from '@/modules/cookie/csrf.server';
import { dataWithToast, redirectWithToast } from '@/modules/cookie/toast.server';
import { createExportPoliciesControl } from '@/resources/control-plane/export-policies.control';
import { IExportPolicyControlResponse } from '@/resources/interfaces/export-policy.interface';
import { newExportPolicySchema } from '@/resources/schemas/export-policy.schema';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Client } from '@hey-api/client-axios';
import {
  ActionFunctionArgs,
  AppLoadContext,
  MetaFunction,
  useParams,
  useRouteLoaderData,
} from 'react-router';

export const handle = {
  breadcrumb: () => <span>Edit</span>,
};

export const meta: MetaFunction = mergeMeta(({ matches }) => {
  const match = matches.find((match) => match.id === 'export-policy-detail') as any;

  const exportPolicy = match.data;
  return metaObject((exportPolicy as IExportPolicyControlResponse)?.name || 'Export Policy');
});

export const action = async ({ request, params, context }: ActionFunctionArgs) => {
  const { projectId, exportPolicyId } = params;
  const { controlPlaneClient } = context as AppLoadContext;
  const exportPoliciesControl = createExportPoliciesControl(controlPlaneClient as Client);

  if (!projectId || !exportPolicyId) {
    throw new BadRequestError('Project ID and export policy ID are required');
  }

  const clonedRequest = request.clone();

  const payload: any = await clonedRequest.json();

  try {
    // Extract CSRF token from JSON payload
    const csrfToken = payload.csrf;
    const resourceVersion = payload.resourceVersion;

    // Create FormData to validate CSRF token
    const formData = new FormData();
    formData.append('csrf', csrfToken);

    // Validate the CSRF token against the request headers
    await validateCSRF(formData, request.headers);

    // Validate form data with Zod
    const parsed = newExportPolicySchema.safeParse(payload);

    if (!parsed.success) {
      throw new Error('Invalid form data');
    }

    const dryRunRes = await exportPoliciesControl.update(
      projectId,
      exportPolicyId,
      payload,
      resourceVersion,
      true
    );

    if (dryRunRes) {
      await exportPoliciesControl.update(
        projectId,
        exportPolicyId,
        payload,
        resourceVersion,
        false
      );
    }

    return redirectWithToast(
      getPathWithParams(paths.project.detail.metrics.exportPolicies.root, {
        projectId,
      }),
      {
        title: 'Export policy updated successfully',
        description: 'You have successfully updated an export policy.',
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

export default function ExportPolicyEditPage() {
  const exportPolicy = useRouteLoaderData('export-policy-detail');

  const { projectId } = useParams();

  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <ExportPolicyUpdateForm defaultValue={exportPolicy} projectId={projectId} />
    </div>
  );
}
