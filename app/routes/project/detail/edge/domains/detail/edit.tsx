import { DomainForm } from '@/features/edge/domain/form';
import { validateCSRF } from '@/modules/cookie/csrf.server';
import { dataWithToast, redirectWithToast } from '@/modules/cookie/toast.server';
import { createDomainsControl } from '@/resources/control-plane/domains.control';
import { domainSchema } from '@/resources/schemas/domain.schema';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { parseWithZod } from '@conform-to/zod/v4';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, useRouteLoaderData, useParams, ActionFunctionArgs } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Edit</span>,
};

export const action = async ({ params, context, request }: ActionFunctionArgs) => {
  const { projectId, domainId } = params;

  if (!projectId || !domainId) {
    throw new Error('Project ID and domain ID are required');
  }

  const clonedRequest = request.clone();
  const formData = await clonedRequest.formData();

  try {
    await validateCSRF(formData, clonedRequest.headers);

    const parsed = parseWithZod(formData, { schema: domainSchema });

    if (parsed.status !== 'success') {
      throw new Error('Invalid form data');
    }

    const { controlPlaneClient } = context as AppLoadContext;
    const domainsControl = createDomainsControl(controlPlaneClient as Client);

    const dryRunRes = await domainsControl.update(projectId, domainId, parsed.value, true);

    if (dryRunRes) {
      await domainsControl.update(projectId, domainId, parsed.value, false);
    }

    return redirectWithToast(
      getPathWithParams(paths.project.detail.domains.detail.root, {
        projectId,
      }),
      {
        title: 'Domain updated successfully',
        description: 'You have successfully updated a domain.',
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

export default function DomainEditPage() {
  const domain = useRouteLoaderData('domain-detail');

  const { projectId } = useParams();

  return (
    <div className="mx-auto w-full max-w-2xl py-8">
      <DomainForm projectId={projectId} defaultValue={domain} />
    </div>
  );
}
