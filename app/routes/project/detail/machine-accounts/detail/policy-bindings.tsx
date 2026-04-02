import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { PolicyBindingTable } from '@/features/policy-binding';
import {
  PolicyBindingFormDialog,
  type PolicyBindingFormDialogRef,
} from '@/features/policy-binding/form/policy-binding-form-dialog';
import type { DataTableRowActionsProps } from '@/modules/datum-ui/components/data-table';
import {
  usePolicyBindings,
  useDeletePolicyBinding,
  type PolicyBinding,
} from '@/resources/policy-bindings';
import { useMachineAccount } from '@/resources/machine-accounts';
import { useApp } from '@/providers/app.provider';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Button, toast } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { ShieldIcon } from 'lucide-react';
import { useCallback, useMemo, useRef } from 'react';
import { MetaFunction, useParams } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Roles</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Roles'));

export default function MachineAccountPolicyBindingsPage() {
  const { projectId, machineAccountId } = useParams();
  const { orgId } = useApp();
  const dialogRef = useRef<PolicyBindingFormDialogRef>(null);
  const { confirm } = useConfirmationDialog();

  const { data: machineAccount } = useMachineAccount(projectId ?? '', machineAccountId ?? '');

  const { data: allBindings = [] } = usePolicyBindings(orgId ?? '');

  // If identityEmail is available, show bindings where this machine account is a subject.
  // Otherwise fall back to all bindings scoped to this project.
  const bindings = useMemo(() => {
    if (!machineAccount?.identityEmail) return [];
    return allBindings.filter((b) =>
      b.subjects.some((s) => s.name === machineAccount.identityEmail)
    );
  }, [allBindings, machineAccount?.identityEmail]);

  const deleteMutation = useDeletePolicyBinding(orgId ?? '', {
    onSuccess: () => toast.success('Role deleted'),
    onError: (error) => toast.error('Error', { description: error.message }),
  });

  const deletePolicyBinding = useCallback(
    async (binding: PolicyBinding) => {
      await confirm({
        title: 'Delete Role',
        description: (
          <span>
            Are you sure you want to delete <strong>{binding.name}</strong>?
          </span>
        ),
        submitText: 'Delete',
        cancelText: 'Cancel',
        variant: 'destructive',
        showConfirmInput: false,
        onSubmit: async () => {
          deleteMutation.mutate(binding.name);
        },
      });
    },
    [confirm, deleteMutation]
  );

  const rowActions: DataTableRowActionsProps<PolicyBinding>[] = useMemo(
    () => [
      {
        key: 'delete',
        label: 'Delete',
        variant: 'destructive',
        display: 'inline',
        action: (row) => deletePolicyBinding(row),
      },
    ],
    [deletePolicyBinding]
  );

  return (
    <>
      <PolicyBindingTable
        bindings={bindings}
        tableTitle={{
          actions: (
            <Button
              type="quaternary"
              theme="outline"
              size="small"
              onClick={() => dialogRef.current?.show()}>
              <Icon icon={ShieldIcon} className="size-4" />
              Grant role on this project
            </Button>
          ),
        }}
        rowActions={rowActions}
      />
      <PolicyBindingFormDialog
        ref={dialogRef}
        orgId={orgId ?? ''}
        scope="project"
        projectId={projectId}
        subject={
          machineAccount?.identityEmail
            ? { kind: 'User', name: machineAccount.identityEmail, uid: machineAccount.uid }
            : undefined
        }
      />
    </>
  );
}
