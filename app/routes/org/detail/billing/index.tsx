import { DateTime } from '@/components/date-time';
import { Table } from '@/components/table';
import {
  CreateBillingAccountDialog,
  type CreateBillingAccountValues,
} from '@/features/billing/dialogs/create-billing-account-dialog';
import {
  getBillingAccountDisplayName,
  getDefaultOrgBillingAccountName,
  type BillingAccount,
  type BillingAccountBinding,
} from '@/features/billing/types';
import { FeatureFlag } from '@/modules/feature-flags';
import { requireBillingForOrg } from '@/modules/feature-flags/billing-gate.server';
import { isFeatureEnabled } from '@/modules/feature-flags/evaluate.server';
import { PermissionButton } from '@/modules/rbac';
import { useApp } from '@/providers/app.provider';
import {
  billingAccountBindingKeys,
  createBillingAccountBindingService,
  useBillingAccountBindings,
  useBillingAccountBindingsWatch,
  type CreateBillingAccountBindingInput,
} from '@/resources/billing-account-bindings';
import {
  billingAccountKeys,
  createBillingAccountService,
  useBillingAccounts,
  useBillingAccountsWatch,
  useCreateBillingAccount,
} from '@/resources/billing-accounts';
import { newBindingName } from '@/resources/billing/_naming';
import { useProjects, useProjectsWatch, type ProjectList } from '@/resources/projects';
import { createProjectService } from '@/resources/projects/project.service';
import { buildOrganizationNamespace } from '@/utils/common';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { openSupportMessage } from '@/utils/open-support-message';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@datum-cloud/datum-ui/select';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowRightIcon, ArrowUpIcon, FolderRoot, PlusIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import {
  type LoaderFunctionArgs,
  type MetaFunction,
  Link,
  redirect,
  useLoaderData,
  useNavigate,
  useParams,
} from 'react-router';

export const meta: MetaFunction = mergeMeta(() => metaObject('Billing'));

/**
 * Flat switcher-row shape rendered by the table. Computed client-side
 * by left-joining the org's projects with their currently-active
 * binding (if any). Projects without a binding still appear so the
 * user can pick an account from the per-row dropdown.
 */
interface SwitcherRow {
  projectName: string;
  projectDisplayName: string;
  /** Empty string when the project doesn't have an active binding yet. */
  billingAccountName: string;
  linkedAt: string;
}

/**
 * Org-level billing — projects-to-account switcher.
 *
 * The full management surface (addresses, payment methods, invoices,
 * credits, recipients) lives one level up at `/account/billing/[id]`.
 * This page is the per-org "which account is funding which project"
 * pivot:
 *   - one row per project in the org
 *   - current binding shown inline with a "Change" picker per row
 *   - "View account" deep-links into the user-level detail page
 *   - the create CTA is gated by the `multi-billing-accounts` flag for
 *     orgs only entitled to a single account.
 *
 * Data flow:
 *   loader → service.list() seeds React Query via `initialData` →
 *   useXxx hooks read from the cache → useXxxsWatch keeps the cache
 *   fresh as the controller publishes status changes / new bindings.
 */
export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { orgId } = params;
  await requireBillingForOrg(orgId);

  if (!orgId) {
    const emptyProjects: ProjectList = { items: [], hasMore: false, nextCursor: null };
    return {
      accounts: [] as BillingAccount[],
      bindings: [] as BillingAccountBinding[],
      projects: emptyProjects,
      multiBillingAccountsEnabled: false,
    };
  }

  // Fan the three reads out in parallel — they're independent and the
  // page renders meaningful partial state from any subset. The loader
  // returns the raw service results; component-level joining keeps
  // the React Query caches independently watchable.
  const [accounts, bindings, projects, multiBillingAccountsEnabled] = await Promise.all([
    createBillingAccountService().list(orgId),
    createBillingAccountBindingService().list(orgId),
    createProjectService().list(orgId),
    isFeatureEnabled(FeatureFlag.MultiBillingAccounts, orgId),
  ]);

  // Nothing to switch when the org has no projects — this page is a
  // projects-to-account pivot, so send the user straight to their billing
  // account instead of a "create a project first" dead-end. Billing stays
  // viewable without any linked projects. Only redirect when there's an
  // account to land on; otherwise fall through to the empty state so they
  // can still create one.
  if (projects.items.length === 0) {
    const defaultAccountName = getDefaultOrgBillingAccountName(accounts);
    if (defaultAccountName) {
      throw redirect(
        getPathWithParams(paths.account.billing.detail.root, {
          billingAccountId: defaultAccountName,
        })
      );
    }
  }

  return { accounts, bindings, projects, multiBillingAccountsEnabled };
};

export default function OrgBillingSwitcherPage() {
  const navigate = useNavigate();
  const { orgId } = useParams();
  const { user } = useApp();
  const queryClient = useQueryClient();
  const {
    accounts: initialAccounts,
    bindings: initialBindings,
    projects: initialProjects,
    multiBillingAccountsEnabled,
  } = useLoaderData<typeof loader>();

  const [openCreateDialog, setOpenCreateDialog] = useState(false);

  // Seed the create dialog's contact-name field from the signed-in
  // user. `user.fullName` is built as `${givenName} ${familyName}` in
  // the user adapter — when either part is missing that helper hands
  // back literal "undefined" tokens, so we recompose here from the
  // raw fields and filter out empties.
  const defaultContactName = useMemo(
    () => [user?.givenName, user?.familyName].filter(Boolean).join(' ').trim(),
    [user?.givenName, user?.familyName]
  );

  // Hydrate each cache directly from the loader. Watches keep them
  // fresh; `staleTime` stops the page from re-issuing fetches when
  // the user navigates back and forth between sibling tabs.
  const accountsQuery = useBillingAccounts(orgId, {
    initialData: initialAccounts,
    initialDataUpdatedAt: Date.now(),
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
  });
  const bindingsQuery = useBillingAccountBindings(orgId, {
    initialData: initialBindings,
    initialDataUpdatedAt: Date.now(),
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
  });
  const projectsQuery = useProjects(orgId ?? '', undefined, {
    initialData: initialProjects,
    initialDataUpdatedAt: Date.now(),
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
  });

  useBillingAccountsWatch(orgId);
  useBillingAccountBindingsWatch(orgId);
  useProjectsWatch(orgId ?? '');

  const accounts = accountsQuery.data ?? initialAccounts;
  const allBindings = bindingsQuery.data ?? initialBindings;
  const projects = projectsQuery.data ?? initialProjects;

  const accountByName = useMemo(() => {
    const map = new Map<string, BillingAccount>();
    for (const account of accounts) {
      if (account.metadata?.name) map.set(account.metadata.name, account);
    }
    return map;
  }, [accounts]);

  // Project bindings are immutable — collapse the list down to the
  // active binding per project so the picker shows the funding
  // account today, not historical ones.
  const activeBindingByProject = useMemo(() => {
    const map = new Map<string, BillingAccountBinding>();
    for (const binding of allBindings) {
      const projectRef = binding.spec?.projectRef?.name;
      if (!projectRef) continue;
      if (binding.status?.phase && binding.status.phase !== 'Active') continue;
      map.set(projectRef, binding);
    }
    return map;
  }, [allBindings]);

  const rows: SwitcherRow[] = useMemo(
    () =>
      projects.items.map((project) => {
        const binding = activeBindingByProject.get(project.name);
        const establishedAt =
          binding?.status?.billingResponsibility?.establishedAt ??
          binding?.metadata?.creationTimestamp ??
          '';
        return {
          projectName: project.name,
          projectDisplayName: project.displayName ?? project.name,
          billingAccountName: binding?.spec?.billingAccountRef?.name ?? '',
          linkedAt: establishedAt,
        };
      }),
    [projects.items, activeBindingByProject]
  );

  const createAccountMutation = useCreateBillingAccount({
    onSuccess: (account) => {
      const accountName = account.metadata?.name ?? '';
      setOpenCreateDialog(false);
      toast.success('Billing account created', {
        description: `${getBillingAccountDisplayName(account)} is ready to set up.`,
      });
      navigate(
        getPathWithParams(paths.account.billing.detail.root, { billingAccountId: accountName })
      );
    },
    onError: (error) => {
      toast.error('Could not create billing account', {
        description: error.message || 'Please try again.',
      });
    },
  });

  /**
   * Optimistic rebind. Reaches into the cached binding list and
   * appends a synthetic active binding for the (project, account)
   * pair so the per-row picker flips immediately, marks the previous
   * active binding `Superseded` so `activeBindingByProject` picks the
   * new one up, and rolls everything back on failure. The watch +
   * `onSettled` invalidation reconcile the cache with server state
   * once the controller catches up.
   *
   * Written as a bare `useMutation` rather than `useCreateBillingAccountBinding`
   * so we can carry an `onMutate` context — the resource hook's
   * generic doesn't expose `TContext` and adding it cross-cuts every
   * other consumer.
   */
  const rebindMutation = useMutation<
    BillingAccountBinding,
    Error,
    CreateBillingAccountBindingInput,
    { previous: BillingAccountBinding[] | undefined }
  >({
    mutationFn: (input) => createBillingAccountBindingService().create(input),
    onMutate: async ({ orgId: targetOrg, projectName, billingAccountName }) => {
      await queryClient.cancelQueries({
        queryKey: billingAccountBindingKeys.list(targetOrg),
      });
      const previous = queryClient.getQueryData<BillingAccountBinding[]>(
        billingAccountBindingKeys.list(targetOrg)
      );
      queryClient.setQueryData<BillingAccountBinding[]>(
        billingAccountBindingKeys.list(targetOrg),
        (old) => {
          const list = old ?? [];
          const stamped: BillingAccountBinding = {
            apiVersion: 'billing.miloapis.com/v1alpha1',
            kind: 'BillingAccountBinding',
            metadata: {
              name: newBindingName(projectName),
              namespace: buildOrganizationNamespace(targetOrg),
              creationTimestamp: new Date().toISOString(),
            },
            spec: {
              projectRef: { name: projectName },
              billingAccountRef: { name: billingAccountName },
            },
            status: { phase: 'Active' },
          };
          const supersededPrev = list.map((b) =>
            b.spec?.projectRef?.name === projectName &&
            (!b.status?.phase || b.status.phase === 'Active')
              ? { ...b, status: { ...b.status, phase: 'Superseded' as const } }
              : b
          );
          return [...supersededPrev, stamped];
        }
      );
      return { previous };
    },
    onError: (error, input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(billingAccountBindingKeys.list(input.orgId), context.previous);
      }
      toast.error('Could not update billing', {
        description: error.message || 'Please try again.',
      });
    },
    onSuccess: (_binding, { billingAccountName }) => {
      const target = accountByName.get(billingAccountName);
      toast.success('Billing account updated', {
        description: target
          ? `Project will be billed against ${getBillingAccountDisplayName(target)}.`
          : 'The change will apply to upcoming invoices.',
      });
    },
    onSettled: (_data, _error, input) => {
      queryClient.invalidateQueries({
        queryKey: billingAccountBindingKeys.list(input.orgId),
      });
    },
  });

  const handleCreate = useCallback(
    async (values: CreateBillingAccountValues) => {
      const owningOrg = values.organizationName || orgId;
      if (!owningOrg) {
        toast.error('Pick an organization to create this account under.');
        return;
      }
      await createAccountMutation.mutateAsync({
        orgId: owningOrg,
        displayName: values.displayName,
        name: values.name,
        invoiceEmails: values.invoiceEmails,
      });
    },
    [createAccountMutation, orgId]
  );

  const handleRebind = useCallback(
    (projectName: string, billingAccountName: string) => {
      if (!orgId) return;
      rebindMutation.mutate({ orgId, projectName, billingAccountName });
    },
    [orgId, rebindMutation]
  );

  // Layout-level `onPrefetch` warms sibling caches on hover; we do the
  // matching thing on the create-button hover so the detail page lands
  // with the new account already cached. Safe to keep this idempotent
  // because the mutation hook seeds the same key.
  const prefetchDetail = useCallback(
    (accountName: string) => {
      if (!orgId) return;
      void queryClient.prefetchQuery({
        queryKey: billingAccountKeys.detail(orgId, accountName),
        queryFn: () => createBillingAccountService().get(orgId, accountName),
      });
    },
    [orgId, queryClient]
  );

  const columns: ColumnDef<SwitcherRow>[] = useMemo(
    () => [
      {
        header: 'Project',
        id: 'project',
        accessorFn: (row) => row.projectDisplayName,
        cell: ({ row }) => (
          <Link
            to={getPathWithParams(paths.project.detail.settings.billing, {
              projectId: row.original.projectName,
            })}
            className="text-foreground hover:text-primary inline-flex items-center gap-2 font-medium transition-colors">
            <Icon icon={FolderRoot} className="text-icon-primary size-3.5" />
            <div className="flex flex-col">
              <span className="text-sm">{row.original.projectDisplayName}</span>
              <span className="text-muted-foreground text-xs">{row.original.projectName}</span>
            </div>
          </Link>
        ),
      },
      {
        header: 'Billing account',
        id: 'billingAccount',
        accessorFn: (row) => row.billingAccountName,
        cell: ({ row }) => {
          if (!row.original.billingAccountName) {
            return <span className="text-muted-foreground text-xs">Not set</span>;
          }
          const account = accountByName.get(row.original.billingAccountName);
          if (account?.metadata?.name) {
            return (
              <Link
                to={getPathWithParams(paths.account.billing.detail.root, {
                  billingAccountId: account.metadata.name,
                })}
                onMouseEnter={() => prefetchDetail(account.metadata!.name!)}
                className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-sm font-medium">
                {getBillingAccountDisplayName(account)}
                <Icon icon={ArrowRightIcon} className="size-3" />
              </Link>
            );
          }
          // Cross-org binding: the account funding this project lives
          // in a different org's namespace, so it's not in the
          // per-org picker. Surface the resource ID so the user knows
          // *something* is bound, and link into the user-level detail
          // page where they can see / change the account in full.
          return (
            <Link
              to={getPathWithParams(paths.account.billing.detail.root, {
                billingAccountId: row.original.billingAccountName,
              })}
              className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-xs">
              External account
              <Icon icon={ArrowRightIcon} className="size-3" />
            </Link>
          );
        },
      },
      {
        header: 'Change',
        id: 'change',
        meta: { tooltip: 'Pick a different billing account to fund this project' },
        cell: ({ row }) => (
          <Select
            value={row.original.billingAccountName || undefined}
            onValueChange={(value) => handleRebind(row.original.projectName, value)}>
            <SelectTrigger className="h-8 w-[18rem] max-w-full text-xs">
              <SelectValue placeholder="Pick an account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.length === 0 ? (
                <SelectItem value="__empty" disabled>
                  No accounts in this org yet
                </SelectItem>
              ) : (
                accounts.map((account) => (
                  <SelectItem
                    key={account.metadata?.name}
                    value={account.metadata?.name ?? ''}
                    disabled={!account.metadata?.name}>
                    {getBillingAccountDisplayName(account)}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        ),
      },
      {
        header: 'Linked',
        id: 'linkedAt',
        accessorKey: 'linkedAt',
        cell: ({ row }) =>
          row.original.linkedAt ? <DateTime date={row.original.linkedAt} /> : null,
      },
    ],
    [accounts, accountByName, handleRebind, prefetchDetail]
  );

  // Single-account orgs get a quiet "ask us for more" CTA in the
  // toolbar — mirrors the previous detail-page CTA. Multi-account
  // orgs see the Create button instead.
  const requestMoreAccountsAction = (
    <Button
      key="request"
      htmlType="button"
      type="quaternary"
      theme="outline"
      size="small"
      onClick={() =>
        openSupportMessage({
          subject: 'Request additional billing accounts',
          text:
            `Hello team,\n\n` +
            `I'd like to enable multiple billing accounts for my organization so I can split usage across separate invoices / payment methods.\n\n` +
            `Details:\n` +
            `- Organization: ${orgId ?? '[please specify]'}\n` +
            `- Reason / use case: [brief context, e.g., separate billing for production vs. staging]\n\n` +
            `Thank you!`,
        })
      }
      icon={<Icon icon={ArrowUpIcon} className="size-4" />}>
      Request additional billing accounts
    </Button>
  );

  const createAction = (
    <PermissionButton
      key="create"
      resource="billingaccounts"
      verb="create"
      group="billing.miloapis.com"
      namespace={orgId ? buildOrganizationNamespace(orgId) : undefined}
      scope="org"
      deniedReason="You don't have permission to create billing accounts in this organization"
      htmlType="button"
      type="primary"
      theme="solid"
      size="small"
      className="w-full sm:w-auto"
      onClick={() => setOpenCreateDialog(true)}
      icon={<Icon icon={PlusIcon} className="size-4" />}>
      Create billing account
    </PermissionButton>
  );

  return (
    <>
      <Table.Client
        title="Billing"
        columns={columns}
        data={rows}
        search="Search projects"
        searchableColumns={['projectDisplayName', 'projectName', 'billingAccountName']}
        getRowId={(row) => row.projectName}
        actions={multiBillingAccountsEnabled ? [createAction] : [requestMoreAccountsAction]}
        empty={{
          title: 'No projects in this organization yet',
          description:
            'Create a project under this organization to assign it a billing account and start tracking usage.',
        }}
      />

      <CreateBillingAccountDialog
        open={openCreateDialog}
        onOpenChange={setOpenCreateDialog}
        defaultContactEmail={user?.email}
        defaultContactName={defaultContactName}
        defaultOrganization={orgId}
        onSubmit={handleCreate}
      />
    </>
  );
}
