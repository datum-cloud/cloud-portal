import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { Field } from '@/components/field/field';
import { SelectRole } from '@/components/select-role/select-role';
import { ResourceForm } from '@/features/policy-binding/form/resource-form';
import { SubjectsForm } from '@/features/policy-binding/form/subjects-form';
import { useApp } from '@/providers/app.provider';
import type { CreatePolicyBindingInput, PolicyBinding } from '@/resources/policy-bindings';
import {
  PolicyBindingSubjectKind,
  NewPolicyBindingSchema,
  newPolicyBindingSchema,
  useDeletePolicyBinding,
} from '@/resources/policy-bindings';
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
import { Button, toast } from '@datum-ui/components';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@datum-ui/components';
import { useEffect, useMemo, useState } from 'react';
import { Form, useNavigate } from 'react-router';

interface PolicyBindingFormProps {
  defaultValue?: PolicyBinding;
  onSubmit?: (data: CreatePolicyBindingInput) => void;
  isPending?: boolean;
}

export const PolicyBindingForm = ({
  defaultValue,
  onSubmit,
  isPending = false,
}: PolicyBindingFormProps) => {
  const { orgId } = useApp();
  const navigate = useNavigate();
  const { confirm } = useConfirmationDialog();

  const [formattedValues, setFormattedValues] = useState<NewPolicyBindingSchema>();

  const deleteMutation = useDeletePolicyBinding(orgId ?? '', {
    onSuccess: () => {
      toast.success('Policy binding deleted successfully');
      navigate(getPathWithParams(paths.org.detail.policyBindings.root, { orgId }));
    },
    onError: (error) => {
      toast.error('Error', { description: error.message });
    },
  });

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
      confirmValue: defaultValue?.name,
      confirmInputLabel: `Type "${defaultValue?.name}" to confirm.`,
      onSubmit: async () => {
        deleteMutation.mutate(defaultValue?.name ?? '');
      },
    });
  };

  const [form, fields] = useForm({
    id: 'policy-binding-form',
    constraint: getZodConstraint(newPolicyBindingSchema),
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: newPolicyBindingSchema });
    },
    onSubmit(event, { submission }) {
      event.preventDefault();

      if (submission?.status !== 'success' || !onSubmit) {
        return;
      }

      const data = submission.value;
      const input: CreatePolicyBindingInput = {
        resource: {
          ref: data.resource.ref,
          name: data.resource.name,
          namespace: data.resource.namespace,
          uid: data.resource.uid,
        },
        role: data.role,
        roleNamespace: data.roleNamespace,
        subjects: data.subjects.map((s) => ({
          kind: s.kind as 'User' | 'Group',
          name: s.name,
          uid: s.uid,
        })),
      };

      onSubmit(input);
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
          autoComplete="off"
          className="mt-6 flex flex-col gap-10">
          <CardContent className="space-y-10">
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
                type="danger"
                theme="solid"
                disabled={isPending}
                onClick={deletePolicyBinding}>
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="quaternary"
                theme="borderless"
                disabled={isPending}
                onClick={() => {
                  navigate(-1);
                }}>
                Return to List
              </Button>
              <Button htmlType="submit" disabled={isPending} loading={isPending}>
                {isPending ? `${isEdit ? 'Saving' : 'Creating'}` : `${isEdit ? 'Save' : 'Create'}`}
              </Button>
            </div>
          </CardFooter>
        </Form>
      </FormProvider>
    </Card>
  );
};
