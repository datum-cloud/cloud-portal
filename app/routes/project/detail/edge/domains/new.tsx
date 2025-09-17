import { DomainForm } from '@/features/edge/domain/form';
import { validateCSRF } from '@/modules/cookie/csrf.server';
import { dataWithToast } from '@/modules/cookie/toast.server';
import { createDomainsControl } from '@/resources/control-plane/domains.control';
import { IDomainControlResponse } from '@/resources/interfaces/domain.interface';
import { domainSchema } from '@/resources/schemas/domain.schema';
import { paths } from '@/utils/config/paths.config';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { parseWithZod } from '@conform-to/zod';
import { Client } from '@hey-api/client-axios';
import {
  ActionFunctionArgs,
  AppLoadContext,
  MetaFunction,
  redirect,
  useParams,
} from 'react-router';

export const handle = {
  breadcrumb: () => <span>New</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('New Domain');
});

export const action = async ({ request, params, context }: ActionFunctionArgs) => {
  const { projectId } = params;

  if (!projectId) {
    throw new Error('Project ID is required');
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

    const dryRunRes = await domainsControl.create(projectId, parsed.value, true);

    let res: IDomainControlResponse = {};
    if (dryRunRes) {
      res = await domainsControl.create(projectId, parsed.value, false);
    }

    return redirect(
      getPathWithParams(paths.project.detail.domains.detail.root, {
        projectId,
        domainId: res.name,
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

export default function DomainNewPage() {
  const { projectId } = useParams();

  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <DomainForm projectId={projectId} />
    </div>
  );
}
