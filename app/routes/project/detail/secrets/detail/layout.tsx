import { createSecretService, useHydrateSecret, type Secret } from '@/resources/secrets';
import { BadRequestError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { LoaderFunctionArgs, MetaFunction, Outlet, useLoaderData, useParams } from 'react-router';

export const handle = {
  breadcrumb: (data: Secret) => <span>{data?.name}</span>,
};

export const meta: MetaFunction<typeof loader> = mergeMeta(({ loaderData }) => {
  const secret = loaderData as Secret;
  return metaObject(secret?.name || 'Secret');
});

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { projectId, secretId } = params;

  if (!projectId || !secretId) {
    throw new BadRequestError('Project ID and secret ID are required');
  }

  // Services now use global axios client with AsyncLocalStorage
  const secretService = createSecretService();
  const secret = await secretService.get(projectId, secretId);

  return secret;
};

export default function SecretDetailLayout() {
  const secret = useLoaderData<typeof loader>();
  const { projectId, secretId } = useParams();

  // Hydrate cache with SSR data
  useHydrateSecret(projectId ?? '', secretId ?? '', secret);

  return <Outlet />;
}
