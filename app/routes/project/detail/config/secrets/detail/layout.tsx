import { createSecretsControl } from '@/resources/control-plane/secrets.control';
import { ISecretControlResponse } from '@/resources/interfaces/secret.interface';
import { CustomError } from '@/utils/error';
import { mergeMeta, metaObject } from '@/utils/meta';
import { Client } from '@hey-api/client-axios';
import { LoaderFunctionArgs, AppLoadContext, MetaFunction, Outlet } from 'react-router';

export const handle = {
  breadcrumb: (data: ISecretControlResponse) => <span>{data?.name}</span>,
};

export const meta: MetaFunction<typeof loader> = mergeMeta(({ data }) => {
  const { secret } = data as any;
  return metaObject((secret as ISecretControlResponse)?.name || 'Secret');
});

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const { projectId, secretId } = params;
  const { controlPlaneClient } = context as AppLoadContext;
  const secretControl = createSecretsControl(controlPlaneClient as Client);

  if (!projectId || !secretId) {
    throw new CustomError('Project ID and secret ID are required', 400);
  }

  const secret = await secretControl.detail(projectId, secretId);

  return secret;
};

export default function SecretDetailLayout() {
  return <Outlet />;
}
