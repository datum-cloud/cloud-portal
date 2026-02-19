import { SecretForm } from '@/features/secret/form/form';
import { AnalyticsAction, useAnalytics } from '@/modules/fathom';
import { useCreateSecret, type SecretNewSchema, type CreateSecretInput } from '@/resources/secrets';
import { paths } from '@/utils/config/paths.config';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { toast } from '@datum-ui/components';
import { MetaFunction, useNavigate, useParams } from 'react-router';

export const handle = {
  breadcrumb: () => <span>New</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('New Secret');
});

export default function ConfigSecretsNewPage() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { trackAction } = useAnalytics();

  const createSecret = useCreateSecret(projectId ?? '', {
    onSuccess: (secret) => {
      trackAction(AnalyticsAction.AddSecret);
      navigate(
        getPathWithParams(paths.project.detail.config.secrets.detail.root, {
          projectId,
          secretId: secret.name,
        })
      );
    },
    onError: (error) => {
      toast.error('Error', {
        description: error.message,
      });
    },
  });

  const handleSubmit = (data: SecretNewSchema) => {
    const input: CreateSecretInput = {
      name: data.name,
      type: data.type as CreateSecretInput['type'],
      variables: data.variables,
      labels: data.labels,
      annotations: data.annotations,
    };

    createSecret.mutate(input);
  };

  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <SecretForm onSubmit={handleSubmit} isPending={createSecret.isPending} />
    </div>
  );
}
