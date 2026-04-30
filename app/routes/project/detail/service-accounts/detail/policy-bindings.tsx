import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { PolicyBindingTable } from '@/features/policy-binding';
import type { PolicyBindingTableRowAction } from '@/features/policy-binding';
import {
  PolicyBindingFormDialog,
  type PolicyBindingFormDialogRef,
} from '@/features/policy-binding/form/policy-binding-form-dialog';
import { useApp } from '@/providers/app.provider';
import {
  usePolicyBindings,
  useDeletePolicyBinding,
  type PolicyBinding,
} from '@/resources/policy-bindings';
import { useServiceAccount } from '@/resources/service-accounts';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { ShieldIcon } from 'lucide-react';
import { useCallback, useMemo, useRef } from 'react';
import { MetaFunction, useParams } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Roles</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Roles'));

export default function ServiceAccountPolicyBindingsPage() {
  const { projectId, serviceAccountId } = useParams();
  const { orgId } = useApp();
  const dialogRef = useRef<PolicyBindingFormDialogRef>(null);
  const { confirm } = useConfirmationDialog();

  const { data: serviceAccount } = useServiceAccount(projectId ?? '', serviceAccountId ?? '');

  const { data: allBindings = [] } = usePolicyBindings(orgId ?? '');

  const bindings = useMemo(() => {
    if (!serviceAccount?.name) return [];
    return allBindings.filter(
      (b) =>
        b.resourceSelector?.resourceRef?.name === projectId &&
        b.subjects.some((s) => s.kind === 'ServiceAccount' && s.name === serviceAccount.name)
    );
  }, [allBindings, serviceAccount?.name, projectId]);

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

  const rowActions: PolicyBindingTableRowAction[] = useMemo(
    () => [
      {
        key: 'delete',
        label: 'Delete',
        variant: 'destructive',
        action: (row) => deletePolicyBinding(row),
      },
    ],
    [deletePolicyBinding]
  );

  return (
    <>
      <PolicyBindingTable
        bindings={bindings}
        empty={{
          title: 'No roles found',
          actions: [
            {
              label: 'Grant role on this project',
              type: 'button',
              onClick: () => dialogRef.current?.show(),
              icon: <ShieldIcon className="size-4" />,
            },
          ],
        }}
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
          serviceAccount?.name
            ? { kind: 'ServiceAccount', name: serviceAccount.name, uid: serviceAccount.uid }
            : undefined
        }
      />
    </>
  );
}
