import { SecretForm } from '@/features/secret/form/form';
import { createSecretsControl } from '@/resources/control-plane';
import { SecretNewSchema, secretNewSchema } from '@/resources/schemas/secret.schema';
import { paths } from '@/utils/config/paths.config';
import { dataWithToast, validateCSRF } from '@/utils/cookies';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { parseWithZod } from '@conform-to/zod/v4';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, MetaFunction, redirect } from 'react-router';

export const handle = {
  breadcrumb: () => <span>New</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('New Secret');
});

export const action = async ({ request, context, params }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  const { projectId } = params;

  const secretControl = createSecretsControl(controlPlaneClient as Client);

  if (!projectId) {
    throw new Error('Project ID is required');
  }

  const clonedRequest = request.clone();
  const formData = await clonedRequest.formData();

  try {
    await validateCSRF(formData, clonedRequest.headers);

    // Validate form data with Zod
    const parsed = parseWithZod(formData, { schema: secretNewSchema });

    const payload = parsed.payload as SecretNewSchema;

    const dryRunRes = await secretControl.create(projectId, payload, true);

    if (dryRunRes) {
      await secretControl.create(projectId, payload, false);
    }

    return redirect(
      getPathWithParams(paths.project.detail.config.secrets.detail.root, {
        projectId,
        secretId: payload.name,
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

export default function ConfigSecretsNewPage() {
  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <SecretForm />
    </div>
  );
}
