import {
  createSecretService,
  useHydrateSecret,
  useSecretWatch,
  type Secret,
} from '@/resources/secrets';
import { BadRequestError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import {
  LoaderFunctionArgs,
  AppLoadContext,
  MetaFunction,
  Outlet,
  useLoaderData,
  useParams,
} from 'react-router';

export const handle = {
  breadcrumb: (data: Secret) => <span>{data?.name}</span>,
};

export const meta: MetaFunction<typeof loader> = mergeMeta(({ loaderData }) => {
  const secret = loaderData as Secret;
  return metaObject(secret?.name || 'Secret');
});

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const { projectId, secretId } = params;
  const { controlPlaneClient, requestId } = context as AppLoadContext;
  const secretService = createSecretService({ controlPlaneClient, requestId });

  if (!projectId || !secretId) {
    throw new BadRequestError('Project ID and secret ID are required');
  }

  const secret = await secretService.get(projectId, secretId);

  return secret;
};

export default function SecretDetailLayout() {
  const secret = useLoaderData<typeof loader>();
  const { projectId, secretId } = useParams();

  // Hydrate cache with SSR data
  useHydrateSecret(projectId ?? '', secretId ?? '', secret);

  // Enable watch for real-time updates
  useSecretWatch(projectId ?? '', secretId ?? '');

  return <Outlet />;
}
