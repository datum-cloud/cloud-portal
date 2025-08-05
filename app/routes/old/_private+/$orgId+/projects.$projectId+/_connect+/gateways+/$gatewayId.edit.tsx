import { paths } from '@/config/paths';
import { GatewayForm } from '@/features/connect/gateway/form';
import { validateCSRF } from '@/modules/cookie/csrf.server';
import { dataWithToast, redirectWithToast } from '@/modules/cookie/toast.server';
import { createGatewaysControl } from '@/resources/control-plane/gateways.control';
import { IGatewayControlResponse } from '@/resources/interfaces/gateway.interface';
import { gatewaySchema } from '@/resources/schemas/gateway.schema';
import { mergeMeta, metaObject } from '@/utils/meta';
import { getPathWithParams } from '@/utils/path';
import { parseWithZod } from '@conform-to/zod';
import { Client } from '@hey-api/client-axios';
import {
  AppLoadContext,
  LoaderFunctionArgs,
  MetaFunction,
  useLoaderData,
  useParams,
} from 'react-router';

export const handle = {
  breadcrumb: (data: IGatewayControlResponse) => <span>{data?.name}</span>,
};

export const meta: MetaFunction = mergeMeta(({ data }) => {
  return metaObject(`Edit ${(data as IGatewayControlResponse)?.name || 'Gateway'}`);
});

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const { projectId, gatewayId } = params;

  if (!projectId || !gatewayId) {
    throw new Error('Project ID and gateway ID are required');
  }

  const { controlPlaneClient } = context as AppLoadContext;
  const gatewaysControl = createGatewaysControl(controlPlaneClient as Client);

  const gateway = await gatewaysControl.detail(projectId, gatewayId);

  return gateway;
};

export const action = async ({ params, context, request }: LoaderFunctionArgs) => {
  const { projectId, gatewayId, orgId } = params;

  if (!projectId || !gatewayId) {
    throw new Error('Project ID and gateway ID are required');
  }

  const { controlPlaneClient } = context as AppLoadContext;
  const gatewaysControl = createGatewaysControl(controlPlaneClient as Client);

  const clonedRequest = request.clone();
  const formData = await clonedRequest.formData();

  try {
    await validateCSRF(formData, clonedRequest.headers);

    const parsed = parseWithZod(formData, { schema: gatewaySchema });

    if (parsed.status !== 'success') {
      throw new Error('Invalid form data');
    }

    const dryRunRes = await gatewaysControl.update(projectId, gatewayId, parsed.value, true);

    if (dryRunRes) {
      await gatewaysControl.update(projectId, gatewayId, parsed.value, false);
    }

    return redirectWithToast(
      getPathWithParams(paths.projects.connect.gateways.root, {
        orgId,
        projectId,
      }),
      {
        title: 'Gateway updated successfully',
        description: 'You have successfully updated a gateway.',
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

export default function ConnectGatewaysEditPage() {
  const gateway = useLoaderData<typeof loader>();
  const { projectId } = useParams();

  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <GatewayForm defaultValue={gateway} projectId={projectId} />
    </div>
  );
}
