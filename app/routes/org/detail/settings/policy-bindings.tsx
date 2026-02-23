import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { PolicyBindingTable } from '@/features/policy-binding';
import {
  PolicyBindingFormDialog,
  type PolicyBindingFormDialogRef,
} from '@/features/policy-binding/form/policy-binding-form-dialog';
import type { DataTableRowActionsProps } from '@/modules/datum-ui/components/data-table';
import {
  createPolicyBindingService,
  useDeletePolicyBinding,
  type PolicyBinding,
} from '@/resources/policy-bindings';
import { BadRequestError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Button, toast } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { PlusIcon } from 'lucide-react';
import { useCallback, useMemo, useRef } from 'react';
import { LoaderFunctionArgs, MetaFunction, useLoaderData, useParams } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Policy Bindings');
});

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { orgId } = params;

  if (!orgId) {
    throw new BadRequestError('Organization ID is required');
  }

  // Services now use global axios client with AsyncLocalStorage
  const policyBindingService = createPolicyBindingService();
  const bindings = await policyBindingService.list(orgId);
  return bindings;
};

export default function OrgPolicyBindingsPage() {
  const { orgId } = useParams();
  const bindings = useLoaderData<typeof loader>() as PolicyBinding[];
  const dialogRef = useRef<PolicyBindingFormDialogRef>(null);

  const { confirm } = useConfirmationDialog();

  const deleteMutation = useDeletePolicyBinding(orgId ?? '', {
    onSuccess: () => {
      toast.success('Policy binding', {
        description: 'The policy binding has been deleted successfully',
      });
    },
    onError: (error) => {
      toast.error('Error', { description: error.message });
    },
  });

  const deletePolicyBinding = useCallback(
    async (policyBinding: PolicyBinding) => {
      await confirm({
        title: 'Delete Policy Binding',
        description: (
          <span>
            Are you sure you want to delete&nbsp;
            <strong>{policyBinding.name}</strong>?
          </span>
        ),
        submitText: 'Delete',
        cancelText: 'Cancel',
        variant: 'destructive',
        showConfirmInput: false,
        onSubmit: async () => {
          deleteMutation.mutate(policyBinding.name);
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
    [orgId, deletePolicyBinding]
  );

  return (
    <>
      <PolicyBindingTable
        bindings={bindings ?? []}
        onRowClick={(row) => dialogRef.current?.show(row)}
        tableTitle={{
          actions: (
            <Button
              type="primary"
              theme="solid"
              size="small"
              onClick={() => dialogRef.current?.show()}>
              <Icon icon={PlusIcon} className="size-4" />
              Add policy binding
            </Button>
          ),
        }}
        rowActions={rowActions}
      />
      <PolicyBindingFormDialog ref={dialogRef} orgId={orgId ?? ''} />
    </>
  );
}
