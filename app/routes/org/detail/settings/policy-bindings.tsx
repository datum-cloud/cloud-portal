import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { PolicyBindingTable } from '@/features/policy-binding';
import type { PolicyBindingTableRowAction } from '@/features/policy-binding';
import {
  PolicyBindingFormDialog,
  type PolicyBindingFormDialogRef,
} from '@/features/policy-binding/form/policy-binding-form-dialog';
import { PermissionButton, useResourcePermissions } from '@/modules/rbac';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runListLoader } from '@/modules/rbac/run-resource-loader';
import {
  createPolicyBindingService,
  useDeletePolicyBinding,
  usePolicyBindings,
  type PolicyBinding,
} from '@/resources/policy-bindings';
import { buildOrganizationNamespace } from '@/utils/common';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { PlusIcon } from 'lucide-react';
import { useCallback, useMemo, useRef } from 'react';
import { type LoaderFunctionArgs, useParams } from 'react-router';

const route = defineResourceRoute<PolicyBinding[]>({
  type: 'list',
  resource: 'policybindings',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to view roles.",
  metaTitle: 'Roles',
  // No seedCache: the DSL's seedCache ctx exposes projectId, but this route
  // is org-scoped (lives under :orgId). The page reads via usePolicyBindings()
  // with `initialData: initialBindings`, which gives synchronous SSR hydration
  // without needing a manual cache write.
});

export const loader = (args: LoaderFunctionArgs) =>
  runListLoader<PolicyBinding[]>(args, {
    resource: 'policybindings',
    group: 'iam.miloapis.com',
    scope: 'org',
    namespace: buildOrganizationNamespace(args.params.orgId!),
    fetch: ({ orgId }) => createPolicyBindingService().list(orgId!),
  });
export const meta = route.meta;

export default route.Page(({ data: initialBindings }) => (
  <PolicyBindingsInner initialBindings={initialBindings} />
));

function PolicyBindingsInner({ initialBindings }: { initialBindings: PolicyBinding[] }) {
  const { orgId = '' } = useParams<{ orgId: string }>();
  const dialogRef = useRef<PolicyBindingFormDialogRef>(null);
  const { confirm } = useConfirmationDialog();

  const { canCreate, canDelete } = useResourcePermissions({
    resource: 'policybindings',
    group: 'iam.miloapis.com',
    scope: 'org',
    verbs: ['create', 'delete'],
  });

  const { data: bindings = initialBindings } = usePolicyBindings(orgId, {
    initialData: initialBindings,
    initialDataUpdatedAt: Date.now(),
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
  });

  const deleteMutation = useDeletePolicyBinding(orgId, {
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
        hidden: () => !canDelete,
        action: (row) => deletePolicyBinding(row),
      },
    ],
    [deletePolicyBinding, canDelete]
  );

  return (
    <>
      <PolicyBindingTable
        bindings={bindings}
        onRowClick={(row) => dialogRef.current?.show(row)}
        tableTitle={{
          actions: canCreate ? (
            <PermissionButton
              resource="policybindings"
              verb="create"
              group="iam.miloapis.com"
              scope="org"
              deniedReason="You don't have permission to add roles"
              type="primary"
              theme="solid"
              size="small"
              className="w-full sm:w-auto"
              onClick={() => dialogRef.current?.show()}>
              <Icon icon={PlusIcon} className="size-4" />
              Add role
            </PermissionButton>
          ) : undefined,
        }}
        rowActions={rowActions}
      />
      <PolicyBindingFormDialog ref={dialogRef} orgId={orgId} />
    </>
  );
}
