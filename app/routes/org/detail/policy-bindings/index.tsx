import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DataTableRowActionsProps } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { PolicyBindingTable } from '@/features/policy-binding';
import { createPolicyBindingsControl } from '@/resources/control-plane';
import { IPolicyBindingControlResponse } from '@/resources/interfaces/policy-binding.interface';
import { ROUTE_PATH as POLICY_BINDINGS_ACTIONS_PATH } from '@/routes/api/policy-bindings';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Client } from '@hey-api/client-axios';
import { PlusIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import {
  AppLoadContext,
  Link,
  LoaderFunctionArgs,
  MetaFunction,
  useFetcher,
  useLoaderData,
  useNavigate,
  useParams,
} from 'react-router';
import { toast } from 'sonner';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Policy Bindings');
});

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { orgId } = params;
  const { controlPlaneClient } = context as AppLoadContext;
  const policyBindingsControl = createPolicyBindingsControl(controlPlaneClient as Client);

  if (!orgId) {
    throw new BadRequestError('Organization ID is required');
  }

  const bindings = await policyBindingsControl.list(orgId);
  return bindings;
};

export default function OrgPolicyBindingsPage() {
  const { orgId } = useParams();
  const bindings = useLoaderData<typeof loader>() as IPolicyBindingControlResponse[];
  const fetcher = useFetcher({ key: 'delete-policy-binding' });
  const navigate = useNavigate();

  const { confirm } = useConfirmationDialog();

  const deletePolicyBinding = async (policyBinding: IPolicyBindingControlResponse) => {
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
      onSubmit: async () => {
        await fetcher.submit(
          {
            id: policyBinding?.name ?? '',
            orgId: orgId ?? '',
          },
          {
            method: 'DELETE',
            action: POLICY_BINDINGS_ACTIONS_PATH,
          }
        );
      },
    });
  };

  const rowActions: DataTableRowActionsProps<IPolicyBindingControlResponse>[] = useMemo(
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

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      if (fetcher.data.success) {
        toast.success('Policy binding deleted successfully', {
          description: 'The policy binding has been deleted successfully',
        });
      } else {
        toast.error(fetcher.data.error);
      }
    }
  }, [fetcher.data, fetcher.state]);

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
            <Button>
              <PlusIcon className="size-4" />
              New Policy Binding
            </Button>
          </Link>
        ),
      }}
      rowActions={rowActions}
    />
  );
}
