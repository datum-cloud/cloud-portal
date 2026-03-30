import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { PolicyBindingTable } from '@/features/policy-binding';
import {
  PolicyBindingFormDialog,
  type PolicyBindingFormDialogRef,
} from '@/features/policy-binding/form/policy-binding-form-dialog';
import type { DataTableRowActionsProps } from '@/modules/datum-ui/components/data-table';
import { useMachineAccount } from '@/resources/machine-accounts';
import {
  createPolicyBindingService,
  useDeletePolicyBinding,
  type PolicyBinding,
} from '@/resources/policy-bindings';
import { BadRequestError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Button, toast } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { ShieldIcon } from 'lucide-react';
import { useCallback, useMemo, useRef } from 'react';
import { LoaderFunctionArgs, MetaFunction, useLoaderData, useParams } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Policy Bindings</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Policy Bindings'));

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { projectId } = params;

  if (!projectId) {
    throw new BadRequestError('Project ID is required');
  }

  const policyBindingService = createPolicyBindingService();
  return policyBindingService.list(projectId);
};

export default function MachineAccountPolicyBindingsPage() {
  const { projectId, machineAccountId } = useParams();
  const bindings = useLoaderData<typeof loader>() as PolicyBinding[];
  const dialogRef = useRef<PolicyBindingFormDialogRef>(null);
  const { confirm } = useConfirmationDialog();

  const { data: account } = useMachineAccount(projectId ?? '', machineAccountId ?? '');

  const deleteMutation = useDeletePolicyBinding(projectId ?? '', {
    onSuccess: () => {
      toast.success('Policy binding deleted');
    },
    onError: (error) => {
      toast.error('Error', { description: error.message });
    },
  });

  const deletePolicyBinding = useCallback(
    async (binding: PolicyBinding) => {
      await confirm({
        title: 'Delete Policy Binding',
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
        key: 'edit',
        label: 'Edit',
        variant: 'default',
        action: (row) => dialogRef.current?.show(row),
      },
      {
        key: 'delete',
        label: 'Delete',
        variant: 'destructive',
        action: (row) => deletePolicyBinding(row),
      },
    ],
    [deletePolicyBinding]
  );

  const handleGrantRole = () => {
    dialogRef.current?.show();
  };

  return (
    <>
      <PolicyBindingTable
        bindings={bindings ?? []}
        onRowClick={(row) => dialogRef.current?.show(row)}
        tableTitle={{
          actions: (
            <div className="flex gap-2">
              <Button type="quaternary" theme="outline" size="small" onClick={handleGrantRole}>
                <Icon icon={ShieldIcon} className="size-4" />
                Grant role on this project
              </Button>
            </div>
          ),
        }}
        rowActions={rowActions}
      />
      <PolicyBindingFormDialog ref={dialogRef} orgId={projectId ?? ''} />
    </>
  );
}
