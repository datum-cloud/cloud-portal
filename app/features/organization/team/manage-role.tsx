import { Field } from '@/components/field/field';
import { SelectRole } from '@/components/select-role/select-role';
import { memberUpdateRoleSchema } from '@/resources/schemas/member.schema';
import { ROUTE_PATH as MEMBER_UPDATE_ROLE_PATH } from '@/routes/api/members';
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
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Form, useFetcher } from 'react-router';
import { useAuthenticityToken } from 'remix-utils/csrf/react';

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
    const csrf = useAuthenticityToken();
    const fetcher = useFetcher();

    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [memberId, setMemberId] = useState<string | undefined>(undefined);
    const resolveRef = useRef<(value: boolean) => void>(null);

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

        if (submission?.status === 'success') {
          setIsSubmitting(true);

          const payload = {
            csrf,
            orgId,
            id: memberId ?? '',
            ...submission.value,
          };

          fetcher.submit(payload, {
            method: 'PATCH',
            action: MEMBER_UPDATE_ROLE_PATH,
            encType: 'application/json',
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

    const handleSuccess = () => {
      resolveRef.current?.(true);
      onSuccess?.();
      setIsOpen(false);
    };

    const handleClose = () => {
      setIsOpen(false);
    };

    useEffect(() => {
      if (fetcher.data && fetcher.state === 'idle') {
        setIsSubmitting(false);
        const { success } = fetcher.data;

        if (success) {
          handleSuccess();
        } else {
          toast.error(fetcher.data.error);
        }
      }
    }, [fetcher.data, fetcher.state]);

    const loading = useMemo(() => {
      return isSubmitting || fetcher.state === 'submitting';
    }, [isSubmitting, fetcher.state]);

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
