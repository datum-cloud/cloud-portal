import type { ServiceAccountDetailContext } from './layout';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { RestrictedState } from '@/components/restricted-state/restricted-state';
import { PolicyBindingTable } from '@/features/policy-binding';
import type { PolicyBindingTableRowAction } from '@/features/policy-binding';
import {
  PolicyBindingFormDialog,
  type PolicyBindingFormDialogRef,
} from '@/features/policy-binding/form/policy-binding-form-dialog';
import { useResourcePermissions } from '@/modules/rbac';
import { gateRouteAccess } from '@/modules/rbac/server/check-permission';
import {
  usePolicyBindings,
  useDeletePolicyBinding,
  type PolicyBinding,
} from '@/resources/policy-bindings';
import { createProjectService } from '@/resources/projects';
import { buildOrganizationNamespace } from '@/utils/common';
import { BadRequestError, withLoaderErrors } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { ShieldIcon } from 'lucide-react';
import { useCallback, useMemo, useRef } from 'react';
import {
  data,
  type LoaderFunctionArgs,
  type MetaFunction,
  useLoaderData,
  useOutletContext,
  useParams,
} from 'react-router';

export const handle = {
  breadcrumb: () => <span>Roles</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Roles'));

export const loader = withLoaderErrors(async (args: LoaderFunctionArgs) => {
  const { projectId, serviceAccountId } = args.params;
  if (!projectId || !serviceAccountId) {
    throw new BadRequestError('Project ID and service account ID are required');
  }

  // Derive orgId server-side from params.projectId. Duplicates parent project
  // fetch — accepted trade-off (spec "Open trade-offs" §1).
  const project = await createProjectService().get(projectId);
  const orgId = project.organizationId;

  if (!orgId) {
    return data({ restricted: true as const });
  }

  // rbac-audit: bespoke — fetches the project to derive orgId, then gates
  // `policybindings:list`. Not a pure gate; stays on direct gateRouteAccess.
  // Next audit: (1) verify scope:'org' is correct for a service account's
  // policy bindings inside a *project* route — same scope nuance as the
  // project-delete fix; (2) the manual `namespace` is redundant (scope-derived
  // since #1288) and can be dropped.
  const allowed = await gateRouteAccess(orgId, {
    resource: 'policybindings',
    verb: 'list',
    group: 'iam.miloapis.com',
    namespace: buildOrganizationNamespace(orgId),
    scope: 'org',
  });

  if (!allowed) return data({ restricted: true as const });
  return data({ restricted: false as const, orgId });
});

export default function ServiceAccountPolicyBindingsPage() {
  const loaderData = useLoaderData<typeof loader>();
  if (loaderData.restricted) {
    return (
      <RestrictedState
        title="Access restricted"
        message="You don't have permission to view roles for this service account."
      />
    );
  }
  return <BindingsPanel orgId={loaderData.orgId} />;
}

function BindingsPanel({ orgId }: { orgId: string }) {
  const { projectId } = useParams();
  const dialogRef = useRef<PolicyBindingFormDialogRef>(null);
  const { confirm } = useConfirmationDialog();

  const { account: serviceAccount } = useOutletContext<ServiceAccountDetailContext>();

  const { data: allBindings = [] } = usePolicyBindings(orgId);

  const { canCreate, canDelete } = useResourcePermissions({
    resource: 'policybindings',
    group: 'iam.miloapis.com',
    namespace: buildOrganizationNamespace(orgId),
    scope: 'org',
    verbs: ['create', 'delete'],
  });

  const bindings = useMemo(() => {
    if (!serviceAccount?.name) return [];
    return allBindings.filter(
      (b) =>
        b.resourceSelector?.resourceRef?.name === projectId &&
        b.subjects.some((s) => s.kind === 'ServiceAccount' && s.name === serviceAccount.name)
    );
  }, [allBindings, serviceAccount?.name, projectId]);

  const deleteMutation = useDeletePolicyBinding(orgId, {
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
    () =>
      canDelete
        ? [
            {
              key: 'delete',
              label: 'Delete',
              variant: 'destructive',
              action: (row) => deletePolicyBinding(row),
            },
          ]
        : [],
    [canDelete, deletePolicyBinding]
  );

  return (
    <Row type="flex" gutter={[24, 24]}>
      <Col span={24}>
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
                disabled: !canCreate,
                tooltip: !canCreate
                  ? "You don't have permission to grant roles on this project"
                  : undefined,
              },
            ],
          }}
          tableTitle={{
            actions: canCreate ? (
              <Button
                type="quaternary"
                theme="outline"
                size="small"
                onClick={() => dialogRef.current?.show()}>
                <Icon icon={ShieldIcon} className="size-4" />
                Grant role on this project
              </Button>
            ) : null,
          }}
          rowActions={rowActions}
        />
      </Col>
      <PolicyBindingFormDialog
        ref={dialogRef}
        orgId={orgId}
        scope="project"
        projectId={projectId}
        subject={
          serviceAccount?.name
            ? { kind: 'ServiceAccount', name: serviceAccount.name, uid: serviceAccount.uid }
            : undefined
        }
      />
    </Row>
  );
}
