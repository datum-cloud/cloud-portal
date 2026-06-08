import { BackButton } from '@/components/back-button';
import { BadgeStatus } from '@/components/badge/badge-status';
import { ChipsOverflow } from '@/components/chips-overflow';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateTime } from '@/components/date-time';
import { Table } from '@/components/table';
import type { RowAction } from '@/components/table/types';
import { canOrgCreateBillingAccount } from '@/features/billing/can-create-billing-account';
import { CardBrandIcon } from '@/features/billing/components/card-brand-icon';
import {
  CreateBillingAccountDialog,
  type CreateBillingAccountValues,
  type OrgOption,
} from '@/features/billing/dialogs/create-billing-account-dialog';
import {
  getBillingAccountDisplayName,
  isBillingAccountReady,
  normalizeCardBrand,
  type BillingAccount,
  type BillingAccountBinding,
  type PaymentMethod,
} from '@/features/billing/types';
import { FeatureFlag } from '@/modules/feature-flags';
import { isFeatureEnabled } from '@/modules/feature-flags/evaluate.server';
import { checkPermissionAPI } from '@/modules/rbac/client/rbac-api';
import { useApp } from '@/providers/app.provider';
import {
  createBillingAccountBindingService,
  useBillingAccountBindingsForOrgs,
} from '@/resources/billing-account-bindings';
import {
  createBillingAccountService,
  useBillingAccountsForOrgs,
  useCreateBillingAccount,
  useDeleteBillingAccount,
} from '@/resources/billing-accounts';
import { useOrganizations } from '@/resources/organizations';
import { createOrganizationService } from '@/resources/organizations/organization.service';
import { createPaymentMethodService, usePaymentMethodsForOrgs } from '@/resources/payment-methods';
import { createProjectService } from '@/resources/projects/project.service';
import { buildOrganizationNamespace, orgIdFromNamespace } from '@/utils/common';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { PageTitle } from '@datum-cloud/datum-ui/page-title';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { useQueries } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Building, PlusIcon, Trash2Icon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { type MetaFunction, useLoaderData, useNavigate } from 'react-router';

const PERMISSION_STALE_TIME = 5 * 60 * 1000;

export const meta: MetaFunction = mergeMeta(() => metaObject('Billing Accounts'));

export const handle = {
  // Billing pages own their own header chrome (BackButton + PageTitle) so
  // the breadcrumb trail inherited from the parent `/account` route would
  // just add noise. The flag is checked on the active leaf only, hence
  // setting it here (not on the layout).
  hideBreadcrumb: true,
};

/**
 * Cross-org billing-accounts listing.
 *
 * The user-scoped IAM proxy doesn't grant cluster-list on
 * `billing.miloapis.com` — every cluster-wide read returns 403 — so
 * we resolve the user's organization memberships first and fan out
 * a namespaced read per org. `Promise.allSettled` on the service
 * layer means a single org with bad RBAC doesn't blank the entire
 * page; we just skip it and surface the rest.
 *
 * Creation also lives here — the dialog asks which org the new
 * account belongs to so the cross-org list acts as a single entry
 * point regardless of which org the account ends up in.
 */
export const loader = async () => {
  const organizations = await createOrganizationService().list();
  const orgIds = organizations.items.map((o) => o.name);
  const [accounts, bindings, paymentMethods] = await Promise.all([
    createBillingAccountService().listForOrgs(orgIds),
    createBillingAccountBindingService().listForOrgs(orgIds),
    createPaymentMethodService().listForOrgs(orgIds),
  ]);

  // Resolve project display names so the "Projects" chip column can
  // show human labels instead of bare resource ids. Only fan out to
  // orgs that actually have an active binding — the list is bounded by
  // the user's org membership so it stays small. Mirrors the per-org
  // hydration the account-detail loader does for its assignments table.
  const bindingOrgIds = new Set<string>();
  for (const binding of bindings) {
    if (binding.status?.phase && binding.status.phase !== 'Active') continue;
    const oid = orgIdFromNamespace(binding.metadata?.namespace);
    if (oid) bindingOrgIds.add(oid);
  }
  const projectsByOrg: Record<string, Array<{ name: string; displayName: string }>> = {};
  await Promise.all(
    Array.from(bindingOrgIds).map(async (oid) => {
      try {
        const list = await createProjectService().list(oid);
        projectsByOrg[oid] = list.items.map((p) => ({
          name: p.name,
          displayName: p.displayName ?? p.name,
        }));
      } catch {
        projectsByOrg[oid] = [];
      }
    })
  );

  const multiBillingByOrg = Object.fromEntries(
    await Promise.all(
      orgIds.map(async (orgId) => {
        const enabled = await isFeatureEnabled(FeatureFlag.MultiBillingAccounts, orgId).catch(
          () => false
        );
        return [orgId, enabled] as const;
      })
    )
  );

  return {
    accounts,
    bindings,
    paymentMethods,
    organizations,
    orgIds,
    projectsByOrg,
    multiBillingByOrg,
  };
};

interface AccountRow {
  account: BillingAccount;
  orgId: string | undefined;
  orgDisplayName: string | undefined;
  /** Bound project display names — drives the "Projects" chip-overflow cell. */
  projectLabels: string[];
  /** Resolved default payment method (may be in a different namespace). */
  defaultPaymentMethod: PaymentMethod | undefined;
}

export default function AccountBillingAccountsPage() {
  const navigate = useNavigate();
  const { user } = useApp();
  const {
    accounts: initialAccounts,
    bindings: initialBindings,
    paymentMethods: initialPaymentMethods,
    organizations: initialOrganizations,
    orgIds: initialOrgIds,
    projectsByOrg,
    multiBillingByOrg: initialMultiBillingByOrg,
  } = useLoaderData<typeof loader>();
  const [openCreateDialog, setOpenCreateDialog] = useState(false);

  // The orgIds list is what every cross-org query keys off — keep
  // it stable across renders so React Query doesn't churn the cache
  // when the OrganizationList object identity flips.
  const orgIds = useMemo(() => initialOrgIds, [initialOrgIds]);

  const permissionQueries = useQueries({
    queries: orgIds.flatMap((id) => [
      {
        queryKey: [
          'permission',
          id,
          '_',
          'billingaccounts',
          'create',
          'billing.miloapis.com',
          buildOrganizationNamespace(id),
          '_',
          'org',
        ] as const,
        queryFn: () =>
          checkPermissionAPI({
            organizationId: id,
            resource: 'billingaccounts',
            verb: 'create',
            group: 'billing.miloapis.com',
            namespace: buildOrganizationNamespace(id),
            scope: 'org',
          }),
        staleTime: PERMISSION_STALE_TIME,
        retry: 1,
      },
      {
        queryKey: [
          'permission',
          id,
          '_',
          'billingaccounts',
          'delete',
          'billing.miloapis.com',
          buildOrganizationNamespace(id),
          '_',
          'org',
        ] as const,
        queryFn: () =>
          checkPermissionAPI({
            organizationId: id,
            resource: 'billingaccounts',
            verb: 'delete',
            group: 'billing.miloapis.com',
            namespace: buildOrganizationNamespace(id),
            scope: 'org',
          }),
        staleTime: PERMISSION_STALE_TIME,
        retry: 1,
      },
    ]),
  });

  const multiBillingByOrg = useMemo(() => initialMultiBillingByOrg, [initialMultiBillingByOrg]);

  // Seed each cache from the loader and let stale-time refetches
  // pick up changes on navigation. There's no cross-org watch — the
  // per-org pages still get live updates via per-org watches, but
  // the cluster-scoped subscription path is closed to billing so we
  // settle for refetch-on-focus semantics here.
  const accountsQuery = useBillingAccountsForOrgs(orgIds, {
    initialData: initialAccounts,
    initialDataUpdatedAt: Date.now(),
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
  });
  const bindingsQuery = useBillingAccountBindingsForOrgs(orgIds, {
    initialData: initialBindings,
    initialDataUpdatedAt: Date.now(),
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
  });
  const paymentMethodsQuery = usePaymentMethodsForOrgs(orgIds, {
    initialData: initialPaymentMethods,
    initialDataUpdatedAt: Date.now(),
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
  });
  const organizationsQuery = useOrganizations(undefined, {
    initialData: initialOrganizations,
    initialDataUpdatedAt: Date.now(),
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
  });

  const accounts = accountsQuery.data ?? initialAccounts;
  const allBindings = bindingsQuery.data ?? initialBindings;
  const allPayments = paymentMethodsQuery.data ?? initialPaymentMethods;
  const organizations = organizationsQuery.data ?? initialOrganizations;

  const accountsPerOrg = useMemo(() => {
    const counts = new Map<string, number>();
    for (const account of accounts) {
      const oid = orgIdFromNamespace(account.metadata?.namespace);
      if (!oid) continue;
      counts.set(oid, (counts.get(oid) ?? 0) + 1);
    }
    return counts;
  }, [accounts]);

  const { canDeletePerOrg, canCreatePerOrg, anyCanCreate, isLoadingPermissions } = useMemo(() => {
    const del = new Map<string, boolean>();
    const create = new Map<string, boolean>();
    let any = false;
    let loading = false;
    for (let i = 0; i < orgIds.length; i++) {
      const id = orgIds[i];
      const createQuery = permissionQueries[i * 2];
      const deleteQuery = permissionQueries[i * 2 + 1];
      const c = createQuery?.data;
      const d = deleteQuery?.data;
      const canCreatePermission = !!c && c.allowed && !c.denied;
      const eligible = canOrgCreateBillingAccount({
        canCreatePermission,
        existingAccountCount: accountsPerOrg.get(id) ?? 0,
        multiBillingAccountsEnabled: multiBillingByOrg[id] ?? false,
      }).allowed;
      create.set(id, eligible);
      if (eligible) any = true;
      del.set(id, !!d && d.allowed && !d.denied);
      if (createQuery?.isLoading || deleteQuery?.isLoading) loading = true;
    }
    return {
      canDeletePerOrg: del,
      canCreatePerOrg: create,
      anyCanCreate: any,
      isLoadingPermissions: loading,
    };
  }, [orgIds, permissionQueries, accountsPerOrg, multiBillingByOrg]);

  // Resolve `${orgId}/${projectName}` → display name from the
  // loader-seeded per-org project lists. Keyed by org so project names
  // that collide across orgs don't bleed into each other.
  const projectDisplayByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const [oid, list] of Object.entries(projectsByOrg)) {
      for (const project of list) map.set(`${oid}/${project.name}`, project.displayName);
    }
    return map;
  }, [projectsByOrg]);

  // Group active bindings by `(namespace, billingAccountName)` so the
  // per-row project chip-list only has to do a Map lookup. We resolve
  // each project's display name here, falling back to the resource id
  // for cross-org rows the loader couldn't hydrate.
  const projectsByAccount = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const binding of allBindings as BillingAccountBinding[]) {
      if (binding.status?.phase && binding.status.phase !== 'Active') continue;
      const ns = binding.metadata?.namespace;
      const accountName = binding.spec?.billingAccountRef?.name;
      const projectName = binding.spec?.projectRef?.name;
      if (!ns || !accountName || !projectName) continue;
      const oid = orgIdFromNamespace(ns);
      const label = (oid && projectDisplayByKey.get(`${oid}/${projectName}`)) || projectName;
      const key = `${ns}/${accountName}`;
      const list = map.get(key);
      if (list) list.push(label);
      else map.set(key, [label]);
    }
    return map;
  }, [allBindings, projectDisplayByKey]);

  // Same grouping key for payment methods so the default-PM column
  // can pick the brand+last4 out without a follow-up read.
  const paymentsByQualifiedName = useMemo(() => {
    const map = new Map<string, PaymentMethod>();
    for (const pm of allPayments) {
      const ns = pm.metadata?.namespace;
      const name = pm.metadata?.name;
      if (!ns || !name) continue;
      map.set(`${ns}/${name}`, pm);
    }
    return map;
  }, [allPayments]);

  const orgsByName = useMemo(
    () => new Map(organizations.items.map((o) => [o.name, o])),
    [organizations.items]
  );

  const rows: AccountRow[] = useMemo(
    () =>
      accounts.map((account) => {
        const ns = account.metadata?.namespace;
        const accountName = account.metadata?.name ?? '';
        const orgId = orgIdFromNamespace(ns);
        const org = orgId ? orgsByName.get(orgId) : undefined;
        const defaultName = account.spec?.defaultPaymentMethodRef?.name;
        return {
          account,
          orgId,
          orgDisplayName: org?.displayName,
          projectLabels: projectsByAccount.get(`${ns}/${accountName}`) ?? [],
          defaultPaymentMethod:
            defaultName && ns ? paymentsByQualifiedName.get(`${ns}/${defaultName}`) : undefined,
        };
      }),
    [accounts, orgsByName, projectsByAccount, paymentsByQualifiedName]
  );

  const orgOptions: OrgOption[] = useMemo(
    () =>
      organizations.items.map((o) => {
        const createQueryIndex = orgIds.indexOf(o.name) * 2;
        const createQuery = createQueryIndex >= 0 ? permissionQueries[createQueryIndex] : undefined;
        const canCreatePermission =
          !!createQuery?.data && createQuery.data.allowed && !createQuery.data.denied;
        const eligibility = canOrgCreateBillingAccount({
          canCreatePermission,
          existingAccountCount: accountsPerOrg.get(o.name) ?? 0,
          multiBillingAccountsEnabled: multiBillingByOrg[o.name] ?? false,
        });
        return {
          name: o.name,
          displayName: o.displayName ?? o.name,
          disabled: !eligibility.allowed,
          disabledReason: eligibility.reason,
        };
      }),
    [organizations.items, orgIds, permissionQueries, accountsPerOrg, multiBillingByOrg]
  );

  // Seed the create dialog's contact-name field from the signed-in
  // user. `user.fullName` is built as `${givenName} ${familyName}` in
  // the user adapter — when either part is missing that helper hands
  // back literal "undefined" tokens, so we recompose here from the
  // raw fields and filter out empties.
  const defaultContactName = useMemo(
    () => [user?.givenName, user?.familyName].filter(Boolean).join(' ').trim(),
    [user?.givenName, user?.familyName]
  );

  const { confirm } = useConfirmationDialog();
  const deleteMutation = useDeleteBillingAccount({
    onSuccess: () => {
      toast.success('Billing account deleted');
    },
    onError: (error) => {
      toast.error('Could not delete billing account', {
        description: error.message || 'Please try again.',
      });
    },
  });

  const handleDelete = useCallback(
    async (row: AccountRow) => {
      if (!row.orgId) return;
      const name = row.account.metadata?.name;
      if (!name) return;
      const displayLabel = getBillingAccountDisplayName(row.account);
      await confirm({
        title: 'Delete billing account',
        description: (
          <span>
            Are you sure you want to delete&nbsp;<strong>{displayLabel}</strong>? Any projects still
            bound to it will lose their funding source.
          </span>
        ),
        submitText: 'Delete',
        cancelText: 'Cancel',
        variant: 'destructive',
        showConfirmInput: true,
        onSubmit: async () => {
          await deleteMutation.mutateAsync({ orgId: row.orgId!, name });
        },
      });
    },
    [confirm, deleteMutation]
  );

  const rowActions: RowAction<AccountRow>[] = useMemo(
    () => [
      {
        key: 'delete',
        label: 'Delete billing account',
        variant: 'destructive',
        // datum-ui's `ActionRow` does `typeof icon === 'function'` to
        // decide whether to instantiate a component icon — that check
        // returns `'object'` for any forwardRef (lucide icons, Radix
        // primitives, etc.) and then tries to render the raw
        // forwardRef object as a child, which React rejects with
        // "Objects are not valid as a React child {$$typeof, render}".
        // Pre-instantiating to JSX here sidesteps the type check.
        icon: <Trash2Icon className="size-4" />,
        onClick: (row) => handleDelete(row),
        // Hide the row action entirely when the user can't delete in
        // that account's owning org. Matches the PR #1275 pattern
        // (DNS-zone row Delete is `hidden` when denied rather than
        // disabled-with-tooltip) — the toolbar is the only honest
        // signal that the affordance even exists.
        hidden: (row) => !row.orgId || canDeletePerOrg.get(row.orgId) !== true,
        // Guard the per-org "keep at least one" floor here. The API
        // also has its own safety nets (bound projects, finalizers)
        // — those errors surface through the mutation's onError.
        disabled: (row) =>
          !row.orgId || (accountsPerOrg.get(row.orgId) ?? 0) <= 1 || deleteMutation.isPending,
        tooltip: (row) => {
          if (!row.orgId) return 'Unknown organization';
          if ((accountsPerOrg.get(row.orgId) ?? 0) <= 1) {
            return 'Every organization must keep at least one billing account.';
          }
          return undefined;
        },
      },
    ],
    [handleDelete, accountsPerOrg, canDeletePerOrg, deleteMutation.isPending]
  );

  const createMutation = useCreateBillingAccount({
    onSuccess: (account) => {
      setOpenCreateDialog(false);
      toast.success('Billing account created', {
        description: `${getBillingAccountDisplayName(account)} is ready to set up.`,
      });
      navigate(
        getPathWithParams(paths.account.billing.detail.root, {
          billingAccountId: account.metadata?.name ?? '',
        })
      );
    },
    onError: (error) => {
      toast.error('Could not create billing account', {
        description: error.message || 'Please try again.',
      });
    },
  });

  const handleCreate = async (values: CreateBillingAccountValues) => {
    const owningOrg = values.organizationName;
    if (!owningOrg) {
      toast.error('Pick an organization to create this account under.');
      return;
    }
    if (canCreatePerOrg.get(owningOrg) !== true) {
      const org = organizations.items.find((o) => o.name === owningOrg);
      const createQueryIndex = orgIds.indexOf(owningOrg) * 2;
      const createQuery = createQueryIndex >= 0 ? permissionQueries[createQueryIndex] : undefined;
      const canCreatePermission =
        !!createQuery?.data && createQuery.data.allowed && !createQuery.data.denied;
      const { reason } = canOrgCreateBillingAccount({
        canCreatePermission,
        existingAccountCount: accountsPerOrg.get(owningOrg) ?? 0,
        multiBillingAccountsEnabled: multiBillingByOrg[owningOrg] ?? false,
      });
      toast.error('Cannot create billing account', {
        description:
          reason ??
          `You cannot add a billing account to ${org?.displayName ?? owningOrg} right now.`,
      });
      return;
    }
    await createMutation.mutateAsync({
      orgId: owningOrg,
      displayName: values.displayName,
      name: values.name,
      invoiceEmails: values.invoiceEmails,
    });
  };

  const columns: ColumnDef<AccountRow>[] = useMemo(
    () => [
      {
        header: 'Name',
        accessorFn: (row) => getBillingAccountDisplayName(row.account),
        id: 'displayName',
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">
              {getBillingAccountDisplayName(row.original.account)}
            </span>
            <span className="text-muted-foreground text-xs">
              {row.original.account.metadata?.name}
            </span>
          </div>
        ),
      },
      {
        header: 'Organization',
        id: 'organization',
        accessorFn: (row) => row.orgDisplayName ?? row.orgId ?? '',
        cell: ({ row }) => {
          if (!row.original.orgId) {
            return <span className="text-muted-foreground text-xs">Unknown</span>;
          }
          return (
            <div className="flex items-center gap-2">
              <Icon icon={Building} className="text-icon-primary size-3.5" />
              <span className="text-foreground text-sm">
                {row.original.orgDisplayName ?? row.original.orgId}
              </span>
            </div>
          );
        },
      },
      {
        header: 'Projects',
        id: 'projects',
        meta: { tooltip: 'Projects funnelling their usage and invoices into this account' },
        cell: ({ row }) => {
          // Prefer the server-aggregated count when present — it'll be
          // populated as the controller catches up — but fall back to
          // the per-binding fan-out so freshly-created accounts still
          // render something useful.
          const linkedCount =
            row.original.account.status?.linkedProjectsCount ?? row.original.projectLabels.length;
          if (linkedCount === 0) {
            return <span className="text-muted-foreground text-xs">No linked projects</span>;
          }
          return (
            <ChipsOverflow items={row.original.projectLabels} maxVisible={2} theme="outline" />
          );
        },
      },
      {
        header: 'Default payment method',
        id: 'defaultPaymentMethod',
        cell: ({ row }) => {
          const ref = row.original.account.spec?.defaultPaymentMethodRef?.name;
          if (!ref) {
            return <span className="text-muted-foreground text-xs">Not set</span>;
          }
          const card = row.original.defaultPaymentMethod?.status?.details?.card;
          if (!card?.last4) {
            return <span className="text-muted-foreground text-xs">{ref}</span>;
          }
          return (
            <div className="flex items-center gap-2">
              <CardBrandIcon brand={normalizeCardBrand(card.brand)} />
              <span className="text-foreground text-sm">•••• {card.last4}</span>
            </div>
          );
        },
      },
      {
        header: 'Status',
        id: 'status',
        accessorFn: (row) => row.account.status?.phase ?? 'Provisioning',
        cell: ({ row }) => (
          <BadgeStatus
            status={isBillingAccountReady(row.original.account) ? 'active' : 'pending'}
            showIcon
          />
        ),
      },
      {
        header: 'Created',
        accessorKey: 'account.metadata.creationTimestamp',
        cell: ({ row }) =>
          row.original.account.metadata?.creationTimestamp ? (
            <DateTime date={row.original.account.metadata.creationTimestamp} />
          ) : null,
      },
    ],
    []
  );

  // Toolbar Create button. Cross-org pages can't reuse
  // `PermissionButton` (it binds to a single org via RbacProvider
  // context), so we replicate its loading/allowed/denied surfaces
  // by hand:
  //   - while the checks are in flight or *any* org allows create,
  //     render the bare Button so a fast click isn't blocked on the
  //     SSAR round-trip
  //   - only once every check has resolved denied do we lock the
  //     button + drop in a Tooltip explaining why
  // Matches the rationale in `PermissionButton.tsx` from #1275.
  const definitivelyDenied = !isLoadingPermissions && !anyCanCreate && orgIds.length > 0;
  const createButton = (
    <Button
      key="create"
      htmlType="button"
      type="primary"
      theme="solid"
      size="small"
      className="w-full sm:w-auto"
      disabled={definitivelyDenied}
      onClick={() => setOpenCreateDialog(true)}
      icon={<Icon icon={PlusIcon} className="size-4" />}>
      Create billing account
    </Button>
  );
  const createAction = definitivelyDenied ? (
    <Tooltip
      key="create"
      message="You can't create billing accounts in any of your organizations right now">
      {createButton}
    </Tooltip>
  ) : (
    createButton
  );

  return (
    <div className="flex w-full flex-col gap-6">
      <BackButton to={paths.home}>Back to Dashboard</BackButton>
      <PageTitle
        title="Billing Accounts"
        description="Manage billing accounts across every organization you're a member of. Addresses, payment methods, invoices, and credits all live here. Pick which organization a new account belongs to when you create it."
      />

      <Table.Client
        columns={columns}
        data={rows}
        search="Search by name"
        searchableColumns={['displayName', 'organization']}
        getRowId={(row) => row.account.metadata?.name ?? ''}
        actions={[createAction]}
        rowActions={rowActions}
        onRowClick={(row) =>
          navigate(
            getPathWithParams(paths.account.billing.detail.root, {
              billingAccountId: row.account.metadata?.name ?? '',
            })
          )
        }
        empty={{
          // Empty-state copy + actions mirror the DNS-zones list: drop
          // the create CTA entirely when nobody can act on it (no
          // point parking a button that 403s on click), and downgrade
          // the title so we don't promise a guided onboarding flow
          // the user can't actually walk through.
          title: definitivelyDenied
            ? 'No billing accounts visible to you'
            : "You don't have any billing accounts yet",
          actions: definitivelyDenied
            ? []
            : [
                {
                  label: 'Create billing account',
                  type: 'button',
                  onClick: () => setOpenCreateDialog(true),
                },
              ],
        }}
      />

      <CreateBillingAccountDialog
        open={openCreateDialog}
        onOpenChange={setOpenCreateDialog}
        defaultContactEmail={user?.email}
        defaultContactName={defaultContactName}
        organizations={orgOptions}
        onSubmit={handleCreate}
      />
    </div>
  );
}
