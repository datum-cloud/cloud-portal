import { Field } from '@/components/field/field';
import { SelectRole } from '@/components/select-role/select-role';
import { memberUpdateRoleSchema, useUpdateMemberRole } from '@/resources/members';
import {
  FormProvider,
  getFormProps,
  getSelectProps,
  useForm,
  useInputControl,
} from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import { Button, toast } from '@datum-ui/components';
import { Dialog } from '@datum-ui/components/dialog';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Form } from 'react-router';

interface ManageRoleModalFormShowProps {
  id: string;
  roleName: string;
  roleNamespace?: string;
}

export type ManageRoleModalFormRef = {
  show: (props: ManageRoleModalFormShowProps) => Promise<boolean>;
};

export interface ManageRoleModalFormProps {
  onSuccess: () => void;
  orgId: string;
}

export const ManageRoleModalForm = forwardRef<ManageRoleModalFormRef, ManageRoleModalFormProps>(
  ({ orgId, onSuccess }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [memberId, setMemberId] = useState<string | undefined>(undefined);
    const resolveRef = useRef<(value: boolean) => void>(null);

    const updateMemberRole = useUpdateMemberRole(orgId, {
      onSuccess: () => {
        resolveRef.current?.(true);
        onSuccess?.();
        setIsOpen(false);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

    const [form, fields] = useForm({
      id: 'invitation-form',
      constraint: getZodConstraint(memberUpdateRoleSchema),
      shouldValidate: 'onSubmit',
      shouldRevalidate: 'onSubmit',
      onValidate({ formData }) {
        return parseWithZod(formData, { schema: memberUpdateRoleSchema });
      },
      defaultValue: {
        role: '',
        roleNamespace: '',
      },
      onSubmit(event, { submission }) {
        event.preventDefault();
        event.stopPropagation();

        if (submission?.status === 'success' && memberId) {
          updateMemberRole.mutate({
            name: memberId,
            roleRef: {
              role: submission.value.role,
              roleNamespace: submission.value.roleNamespace,
            },
          });
        }
      },
    });

    const roleControl = useInputControl(fields.role);
    const roleNamespaceControl = useInputControl(fields.roleNamespace);

    useImperativeHandle(ref, () => ({
      show: ({ id, roleName, roleNamespace }: ManageRoleModalFormShowProps) => {
        setIsOpen(true);
        setMemberId(id);
        roleControl.change(roleName);
        roleNamespaceControl.change(roleNamespace ?? 'datum-cloud');

        return new Promise<boolean>((resolve) => {
          resolveRef.current = resolve;
        });
      },
    }));

    const handleOpenChange = (open: boolean) => {
      if (!open) {
        resolveRef.current?.(false);
      }
      setIsOpen(open);
    };

    const handleClose = () => {
      setIsOpen(false);
    };

    const loading = updateMemberRole.isPending;

    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <Dialog.Content>
          <FormProvider context={form.context}>
            <Form {...getFormProps(form)} id={form.id} method="POST" autoComplete="off">
              <Dialog.Header
                title="Edit Member Role"
                description="Edit the role of the member in the organization."
                onClose={handleClose}
                className="border-b"
              />
              <Dialog.Body className="flex flex-col gap-5 px-5">
                <Field isRequired label="Role" errors={fields.role.errors}>
                  <SelectRole
                    {...getSelectProps(fields.role)}
                    modal
                    name={fields.role.name}
                    id={fields.role.id}
                    key={fields.role.id}
                    defaultValue={roleControl.value}
                    onSelect={(value) => {
                      roleControl.change(value.value);
                      roleNamespaceControl.change(value.namespace ?? 'datum-cloud');
                    }}
                  />
                </Field>

                <input
                  type="hidden"
                  name={fields.roleNamespace.name}
                  value={roleNamespaceControl.value}
                />
              </Dialog.Body>
              <Dialog.Footer className="border-t">
                <Button
                  htmlType="button"
                  type="quaternary"
                  theme="borderless"
                  onClick={handleClose}
                  disabled={loading}>
                  Cancel
                </Button>
                <Button
                  htmlType="submit"
                  form={form.id}
                  type="primary"
                  disabled={loading}
                  loading={loading}>
                  {loading ? 'Saving' : 'Save'}
                </Button>
              </Dialog.Footer>
            </Form>
          </FormProvider>
        </Dialog.Content>
      </Dialog>
    );
  }
);

ManageRoleModalForm.displayName = 'ManageRoleModalForm';
