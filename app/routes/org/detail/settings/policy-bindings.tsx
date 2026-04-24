import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { PolicyBindingTable } from '@/features/policy-binding';
import type { PolicyBindingTableRowAction } from '@/features/policy-binding';
import {
  PolicyBindingFormDialog,
  type PolicyBindingFormDialogRef,
} from '@/features/policy-binding/form/policy-binding-form-dialog';
import {
  createPolicyBindingService,
  useDeletePolicyBinding,
  type PolicyBinding,
} from '@/resources/policy-bindings';
import { BadRequestError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { PlusIcon } from 'lucide-react';
import { useCallback, useMemo, useRef } from 'react';
import { LoaderFunctionArgs, MetaFunction, useLoaderData, useParams } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Roles');
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
      toast.success('Role', {
        description: 'The role has been deleted successfully',
      });
    },
    onError: (error) => {
      toast.error('Error', { description: error.message });
    },
  });

  const deletePolicyBinding = useCallback(
    async (policyBinding: PolicyBinding) => {
      await confirm({
        title: 'Delete Role',
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

  const rowActions: PolicyBindingTableRowAction[] = useMemo(
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
              className="w-full sm:w-auto"
              onClick={() => dialogRef.current?.show()}>
              <Icon icon={PlusIcon} className="size-4" />
              Add role
            </Button>
          ),
        }}
        rowActions={rowActions}
      />
      <PolicyBindingFormDialog ref={dialogRef} orgId={orgId ?? ''} />
    </>
  );
}
