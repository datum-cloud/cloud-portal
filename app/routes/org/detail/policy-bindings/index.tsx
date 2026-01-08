import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { PolicyBindingTable } from '@/features/policy-binding';
import { DataTableRowActionsProps } from '@/modules/datum-ui/components/data-table';
import {
  createPolicyBindingService,
  useDeletePolicyBinding,
  type PolicyBinding,
} from '@/resources/policy-bindings';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button, toast } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { PlusIcon } from 'lucide-react';
import { useMemo } from 'react';
import {
  Link,
  LoaderFunctionArgs,
  MetaFunction,
  useLoaderData,
  useNavigate,
  useParams,
} from 'react-router';

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
  const navigate = useNavigate();

  const { confirm } = useConfirmationDialog();

  const deleteMutation = useDeletePolicyBinding(orgId ?? '', {
    onSuccess: () => {
      toast.success('Policy binding deleted successfully', {
        description: 'The policy binding has been deleted successfully',
      });
    },
    onError: (error) => {
      toast.error('Error', { description: error.message });
    },
  });

  const deletePolicyBinding = async (policyBinding: PolicyBinding) => {
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
      showConfirmInput: true,
      confirmValue: policyBinding.name,
      confirmInputLabel: `Type "${policyBinding.name}" to confirm.`,
      onSubmit: async () => {
        deleteMutation.mutate(policyBinding.name);
      },
    });
  };

  const rowActions: DataTableRowActionsProps<PolicyBinding>[] = useMemo(
    () => [
      {
        key: 'edit',
        label: 'Edit',
        variant: 'default',
        action: (row) =>
          navigate(
            getPathWithParams(paths.org.detail.policyBindings.edit, {
              orgId,
              policyBindingId: row.name,
            })
          ),
      },
      {
        key: 'delete',
        label: 'Delete',
        variant: 'destructive',
        action: (row) => deletePolicyBinding(row),
      },
    ],
    [orgId]
  );

  return (
    <PolicyBindingTable
      bindings={bindings ?? []}
      onRowClick={(row) => {
        navigate(
          getPathWithParams(paths.org.detail.policyBindings.edit, {
            orgId,
            policyBindingId: row.name,
          })
        );
      }}
      tableTitle={{
        title: 'Policy Bindings',
        description: 'Manage your organization policy bindings',
        actions: (
          <Link to={getPathWithParams(paths.org.detail.policyBindings.new, { orgId })}>
            <Button type="primary" theme="solid" size="small">
              <Icon icon={PlusIcon} className="size-4" />
              Add policy binding
            </Button>
          </Link>
        ),
      }}
      rowActions={rowActions}
    />
  );
}
