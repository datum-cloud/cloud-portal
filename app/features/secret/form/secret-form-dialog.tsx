import { InputName } from '@/components/input-name/input-name';
import { SECRET_TYPES } from '@/features/secret/constants';
import { KeyValueFieldArray } from '@/features/secret/form/key-value-field-array';
import { showMutationErrorToast } from '@/modules/quota';
import { AnalyticsAction, useAnalytics } from '@/modules/rybbit';
import {
  type SecretCreateSchema,
  type CreateSecretInput,
  secretCreateSchema,
  useCreateSecret,
  SecretType,
} from '@/resources/secrets';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Form, useWatch, type NormalizedFieldState } from '@datum-cloud/datum-ui/form';
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

export interface SecretFormDialogRef {
  show: () => void;
  hide: () => void;
}

/**
 * Auto-generated resource name field. Watches the sibling `type` select and
 * asks <InputName> to derive a kebab-cased identifier from that type's label
 * (e.g. "TLS" -> tls-secret-8f2a91) plus a random suffix, so names stay
 * unique across the many secrets a project can hold. Falls back to a plain
 * "Secret" base if `type` is ever empty. The user can uncheck "Auto-generate"
 * to type their own name.
 *
 * <Form.Field> wraps this component (in SecretFormDialog below) so Zod
 * validation errors render automatically; <InputName> alone only colors the
 * label red and would not show the error message text.
 */
function SecretNameInput({ field }: { field: NormalizedFieldState }) {
  const type = useWatch('type') as string | undefined;
  const baseName = type
    ? `${SECRET_TYPES[type as keyof typeof SECRET_TYPES]?.label ?? 'Secret'} Secret`
    : 'Secret';

  return (
    <InputName
      label="Resource Name"
      description="This unique resource name will be used to identify your secret and cannot be changed."
      field={field}
      baseName={baseName}
      showTooltip={false}
      autoFocus
    />
  );
}

export const SecretFormDialog = forwardRef<SecretFormDialogRef>((_props, ref) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { trackAction } = useAnalytics();

  const createSecret = useCreateSecret(projectId ?? '', {
    onSuccess: (secret) => {
      trackAction(AnalyticsAction.AddSecret);
      setOpen(false);
      navigate(
        getPathWithParams(paths.project.detail.secrets.detail.root, {
          projectId,
          secretId: secret.name,
        })
      );
    },
    onError: (error) =>
      showMutationErrorToast(error, { fallbackTitle: 'Secret', scope: 'project', projectId }),
  });

  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);

  useImperativeHandle(ref, () => ({ show, hide }), [show, hide]);

  const handleSubmit = (data: SecretCreateSchema) => {
    const input: CreateSecretInput = {
      name: data.name,
      type: data.type as CreateSecretInput['type'],
      variables: data.variables,
    };

    createSecret.mutate(input);
  };

  return (
    <Form.Dialog
      open={open}
      onOpenChange={setOpen}
      title="New Secret"
      description="Create a new secret to store sensitive key-value pairs. Values will be base64-encoded automatically."
      schema={secretCreateSchema}
      defaultValues={{
        type: SecretType.OPAQUE,
        variables: [{ key: '', value: '' }],
      }}
      onSubmit={handleSubmit}
      loading={createSecret.isPending}
      submitText="Create"
      submitTextLoading="Creating..."
      className="w-full focus:ring-0 focus:outline-none sm:max-w-2xl">
      <div className="divide-border space-y-0 divide-y *:px-5 *:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Form.Field name="name" className="w-full sm:w-1/2" required>
            {({ field }) => <SecretNameInput field={field} />}
          </Form.Field>

          <Form.Field name="type" label="Type" className="w-full sm:w-1/2" required>
            <Form.Select placeholder="Select a Type">
              {Object.entries(SECRET_TYPES).map(([type, config]) => (
                <Form.SelectItem key={type} value={type}>
                  {config.label}
                </Form.SelectItem>
              ))}
            </Form.Select>
          </Form.Field>
        </div>

        <KeyValueFieldArray />
      </div>
    </Form.Dialog>
  );
});

SecretFormDialog.displayName = 'SecretFormDialog';
