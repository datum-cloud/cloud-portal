import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { Field } from '@/components/field/field';
import { SelectRole } from '@/components/select-role/select-role';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ResourceForm } from '@/features/policy-binding/form/resource-form';
import { SubjectsForm } from '@/features/policy-binding/form/subjects-form';
import { useIsPending } from '@/hooks/useIsPending';
import { useApp } from '@/providers/app.provider';
import {
  IPolicyBindingControlResponse,
  PolicyBindingSubjectKind,
} from '@/resources/interfaces/policy-binding.interface';
import {
  NewPolicyBindingSchema,
  newPolicyBindingSchema,
} from '@/resources/schemas/policy-binding.schema';
import { ROUTE_PATH as POLICY_BINDINGS_ACTIONS_PATH } from '@/routes/api/policy-bindings';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import {
  FormProvider,
  getFormProps,
  getSelectProps,
  useForm,
  useInputControl,
} from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import { useEffect, useMemo, useState } from 'react';
import { Form, useFetcher, useNavigate } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';

export const PolicyBindingForm = ({
  defaultValue,
}: {
  defaultValue?: IPolicyBindingControlResponse;
}) => {
  const { orgId } = useApp();
  const navigate = useNavigate();
  const isPending = useIsPending();
  const fetcher = useFetcher({ key: 'delete-policy-binding' });
  const { confirm } = useConfirmationDialog();

  const [formattedValues, setFormattedValues] = useState<NewPolicyBindingSchema>();

  const deletePolicyBinding = async () => {
    await confirm({
      title: 'Delete Policy Binding',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{defaultValue?.name}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      onSubmit: async () => {
        await fetcher.submit(
          {
            id: defaultValue?.name ?? '',
            orgId: orgId ?? '',
            redirectUri: getPathWithParams(paths.org.detail.policyBindings.root, {
              orgId,
            }),
          },
          {
            action: POLICY_BINDINGS_ACTIONS_PATH,
            method: 'DELETE',
          }
        );
      },
    });
  };

  const [form, fields] = useForm({
    id: 'policy-binding-form',
    constraint: getZodConstraint(newPolicyBindingSchema),
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: newPolicyBindingSchema });
    },
  });

  const roleControl = useInputControl(fields.role);
  const roleNamespaceControl = useInputControl(fields.roleNamespace);

  const isEdit = useMemo(() => {
    return defaultValue?.uid !== undefined;
  }, [defaultValue]);

  useEffect(() => {
    if (defaultValue && defaultValue.name) {
      setFormattedValues({
        resource: {
          ref: `${defaultValue.resourceSelector?.resourceRef?.apiGroup?.toLowerCase() ?? ''}-${defaultValue.resourceSelector?.resourceRef?.kind.toLowerCase() ?? ''}`,
          name: defaultValue.resourceSelector?.resourceRef?.name ?? '',
          namespace: defaultValue.resourceSelector?.resourceRef?.namespace ?? '',
          uid: defaultValue.resourceSelector?.resourceRef?.uid ?? '',
        },
        role: defaultValue.roleRef?.name ?? '',
        roleNamespace: defaultValue.roleRef?.namespace ?? '',
        subjects: defaultValue.subjects.map((subject) => ({
          kind: subject.kind,
          name: subject.name ?? '',
          namespace: subject.namespace ?? '',
          uid: subject.uid ?? '',
        })),
      });
    } else {
      setFormattedValues({
        resource: {
          ref: 'resourcemanager.miloapis.com-project',
          name: '',
          namespace: '',
          uid: '',
        },
        role: '',
        roleNamespace: '',
        subjects: [
          {
            kind: PolicyBindingSubjectKind.User,
            name: '',
            uid: '',
          },
        ],
      });
    }

    return () => {
      setFormattedValues(undefined);
    };
  }, [defaultValue]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit policy binding' : 'Create a new policy binding'}</CardTitle>
        <CardDescription>
          {isEdit
            ? 'Edit the policy binding with the new values below.'
            : 'Create a new policy binding to get started with Datum Cloud.'}
        </CardDescription>
      </CardHeader>
      <FormProvider context={form.context}>
        <Form
          {...getFormProps(form)}
          id={form.id}
          method="POST"
          autoComplete="off"
          className="flex flex-col gap-6">
          <AuthenticityTokenInput />

          <CardContent className="space-y-4">
            <ResourceForm
              fields={fields as unknown as ReturnType<typeof useForm<NewPolicyBindingSchema>>[1]}
              defaultValue={formattedValues?.resource}
              isEdit={isEdit}
            />
            <div className="flex w-full gap-4">
              <Field isRequired label="Role" errors={fields.role.errors} className="w-1/2">
                <SelectRole
                  {...getSelectProps(fields.role)}
                  disabled={isEdit}
                  name={fields.role.name}
                  id={fields.role.id}
                  key={fields.role.id}
                  defaultValue={formattedValues?.role}
                  onSelect={(value) => {
                    roleControl.change(value.value);
                    roleNamespaceControl.change(value.namespace);
                  }}
                />
              </Field>
              <div className="w-1/2"></div>
            </div>

            <SubjectsForm
              fields={fields as unknown as ReturnType<typeof useForm<NewPolicyBindingSchema>>[1]}
              defaultValue={formattedValues?.subjects}
            />
          </CardContent>
          <CardFooter className="flex justify-between gap-2">
            {isEdit ? (
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={deletePolicyBinding}>
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="link"
                disabled={isPending}
                onClick={() => {
                  navigate(-1);
                }}>
                Return to List
              </Button>
              <Button variant="default" type="submit" disabled={isPending} isLoading={isPending}>
                {isPending ? `${isEdit ? 'Saving' : 'Creating'}` : `${isEdit ? 'Save' : 'Create'}`}
              </Button>
            </div>
          </CardFooter>
        </Form>
      </FormProvider>
    </Card>
  );
};
