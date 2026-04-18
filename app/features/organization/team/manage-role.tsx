import { SelectRole } from '@/components/select-role/select-role';
import { memberUpdateRoleSchema, useUpdateMemberRole } from '@/resources/members';
import { getSelectProps, useInputControl } from '@conform-to/react';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Form } from '@datum-ui/components/form';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import type { z } from 'zod';

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

type MemberUpdateRoleSchema = z.infer<typeof memberUpdateRoleSchema>;

export const ManageRoleModalForm = forwardRef<ManageRoleModalFormRef, ManageRoleModalFormProps>(
  ({ orgId, onSuccess }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [memberId, setMemberId] = useState<string | undefined>(undefined);
    const [defaultValues, setDefaultValues] = useState<Partial<MemberUpdateRoleSchema>>();
    const resolveRef = useRef<(value: boolean) => void>(null);

    const updateMemberRole = useUpdateMemberRole(orgId, {
      onError: (error) => {
        toast.error(error.message);
      },
    });

    const show = useCallback(({ id, roleName, roleNamespace }: ManageRoleModalFormShowProps) => {
      setMemberId(id);
      setDefaultValues({
        role: roleName,
        roleNamespace: roleNamespace ?? 'datum-cloud',
      });
      setIsOpen(true);

      return new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
      });
    }, []);

    useImperativeHandle(ref, () => ({ show }), [show]);

    const handleOpenChange = useCallback((open: boolean) => {
      if (!open) {
        resolveRef.current?.(false);
      }
      setIsOpen(open);
    }, []);

    const handleSubmit = useCallback(
      async (data: MemberUpdateRoleSchema) => {
        if (!memberId) return;

        await updateMemberRole.mutateAsync({
          name: memberId,
          roleRef: {
            role: data.role,
            roleNamespace: data.roleNamespace,
          },
        });

        resolveRef.current?.(true);
        onSuccess?.();
        setIsOpen(false);
      },
      [memberId, updateMemberRole, onSuccess]
    );

    return (
      <Form.Dialog
        key={isOpen ? `open-${memberId}` : 'closed'}
        open={isOpen}
        onOpenChange={handleOpenChange}
        title="Edit Member Role"
        description="Edit the role of the member in the organization."
        schema={memberUpdateRoleSchema}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        loading={updateMemberRole.isPending}
        submitText="Save"
        submitTextLoading="Saving...">
        <div className="space-y-5 px-5">
          <RoleField />
          <RoleNamespaceHiddenField />
        </div>
      </Form.Dialog>
    );
  }
);

ManageRoleModalForm.displayName = 'ManageRoleModalForm';

const RoleField = () => {
  const { fields } = Form.useFormContext();
  const roleNamespaceField = fields.roleNamespace as any;
  const roleNamespaceControl = useInputControl(roleNamespaceField);

  return (
    <Form.Field name="role" label="Role" required>
      {({ control, field }) => (
        <SelectRole
          {...getSelectProps(field, { value: false })}
          modal
          defaultValue={control.value as string}
          onSelect={(value) => {
            control.change(value.value);
            roleNamespaceControl.change(value.namespace ?? 'datum-cloud');
          }}
        />
      )}
    </Form.Field>
  );
};

const RoleNamespaceHiddenField = () => {
  const { fields } = Form.useFormContext();
  const roleNamespaceField = fields.roleNamespace as any;
  const control = useInputControl(roleNamespaceField);

  return (
    <input type="hidden" name={roleNamespaceField.name} value={control.value ?? 'datum-cloud'} />
  );
};
