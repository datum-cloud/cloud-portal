import {
  billingAccountParam,
  orgIdParam,
  orgUsageDaysParam,
  paymentMethodsParam,
  projectIdParam,
  usageDaysParam,
} from './schemas';
import type { BillingAccount, PaymentMethod } from '@/features/billing/types';
import {
  getBillingAccountDisplayName,
  isBillingAccountReady,
  isDefaultPaymentMethod,
  normalizeCardBrand,
} from '@/features/billing/types';
import { summarizeMetersForAssistant } from '@/modules/billing/usage-summary';
import { fetchOrgUsage, fetchProjectUsage } from '@/modules/billing/usage.server';
import { FeatureFlag } from '@/modules/feature-flags';
import { isFeatureEnabled } from '@/modules/feature-flags/evaluate.server';
import { createBillingAccountBindingService } from '@/resources/billing-account-bindings';
import { createBillingAccountService } from '@/resources/billing-accounts';
import { createPaymentMethodService } from '@/resources/payment-methods';
import { createProjectService } from '@/resources/projects';
import { AuthenticationError, AuthorizationError } from '@/utils/errors';
import { tool } from 'ai';

function isAuthError(err: unknown): boolean {
  return err instanceof AuthorizationError || err instanceof AuthenticationError;
}

function isActiveBinding(binding: { status?: { phase?: string } }): boolean {
  return !binding.status?.phase || binding.status.phase === 'Active';
}

async function checkBillingEnabled(orgId: string): Promise<{ enabled: boolean; message?: string }> {
  const enabled = await isFeatureEnabled(FeatureFlag.Billing, orgId).catch(() => false);
  if (!enabled) {
    return {
      enabled: false,
      message: 'Billing is not enabled for this organization.',
    };
  }
  return { enabled: true };
}

function sanitizeBillingAccountSummary(account: BillingAccount, linkedProjectCount: number) {
  const name = account.metadata?.name ?? '';
  return {
    name,
    displayName: getBillingAccountDisplayName(account),
    phase: account.status?.phase ?? 'Provisioning',
    ready: isBillingAccountReady(account),
    currencyCode: account.spec?.currencyCode ?? 'USD',
    defaultPaymentMethodName: account.spec?.defaultPaymentMethodRef?.name ?? null,
    linkedProjectCount,
    url: `/account/billing/${name}`,
  };
}

function sanitizePaymentMethod(method: PaymentMethod, account: BillingAccount | undefined) {
  const card = method.status?.details?.card;
  return {
    name: method.metadata?.name ?? '',
    displayName: method.spec?.displayName ?? method.metadata?.name ?? '',
    billingAccountName: method.spec?.billingAccountRef?.name ?? '',
    phase: method.status?.phase ?? 'Pending',
    isDefault: isDefaultPaymentMethod(method, account),
    card: card
      ? {
          brand: normalizeCardBrand(card.brand),
          last4: card.last4 ?? '',
          expiryMonth: card.expiryMonth,
          expiryYear: card.expiryYear,
        }
      : null,
    url: method.spec?.billingAccountRef?.name
      ? `/account/billing/${method.spec.billingAccountRef.name}`
      : '/account/billing',
  };
}

function sanitizePaymentMethodSummary(
  method: PaymentMethod | undefined,
  account: BillingAccount | undefined
) {
  if (!method) return null;
  const sanitized = sanitizePaymentMethod(method, account);
  return {
    name: sanitized.name,
    displayName: sanitized.displayName,
    phase: sanitized.phase,
    card: sanitized.card,
    isDefault: sanitized.isDefault,
  };
}

export function createBillingTools() {
  return {
    listBillingAccounts: tool({
      description:
        'List all billing accounts in an organization. Use when the user asks about billing accounts, funding, or invoices.',
      inputSchema: orgIdParam,
      execute: async ({ orgId }: { orgId: string }) => {
        const flag = await checkBillingEnabled(orgId);
        if (!flag.enabled) {
          return { status: 'feature-disabled' as const, message: flag.message, accounts: [] };
        }

        let accounts;
        let bindings;
        try {
          [accounts, bindings] = await Promise.all([
            createBillingAccountService().list(orgId),
            createBillingAccountBindingService().list(orgId),
          ]);
        } catch (err) {
          if (isAuthError(err)) {
            return {
              status: 'insufficient-permissions' as const,
              message: 'You do not have permission to view billing accounts.',
              accounts: [],
            };
          }
          throw err;
        }

        const activeBindings = bindings.filter(isActiveBinding);
        const projectCountByAccount = new Map<string, number>();
        for (const binding of activeBindings) {
          const accountName = binding.spec?.billingAccountRef?.name;
          if (!accountName) continue;
          projectCountByAccount.set(accountName, (projectCountByAccount.get(accountName) ?? 0) + 1);
        }

        return {
          status: 'ok' as const,
          accounts: accounts.map((account) =>
            sanitizeBillingAccountSummary(
              account,
              projectCountByAccount.get(account.metadata?.name ?? '') ?? 0
            )
          ),
          url: '/account/billing',
        };
      },
    }),

    getBillingAccount: tool({
      description:
        'Get details for a specific billing account including linked projects and default payment method.',
      inputSchema: billingAccountParam,
      execute: async ({
        orgId,
        billingAccountName,
      }: {
        orgId: string;
        billingAccountName: string;
      }) => {
        const flag = await checkBillingEnabled(orgId);
        if (!flag.enabled) {
          return { status: 'feature-disabled' as const, message: flag.message };
        }

        let account;
        let bindings;
        let paymentMethods;
        try {
          [account, bindings, paymentMethods] = await Promise.all([
            createBillingAccountService().get(orgId, billingAccountName),
            createBillingAccountBindingService().list(orgId),
            createPaymentMethodService().list(orgId),
          ]);
        } catch (err) {
          if (isAuthError(err)) {
            return {
              status: 'insufficient-permissions' as const,
              message: 'You do not have permission to view this billing account.',
            };
          }
          throw err;
        }

        const linkedProjectNames = bindings
          .filter(
            (b) => isActiveBinding(b) && b.spec?.billingAccountRef?.name === billingAccountName
          )
          .map((b) => b.spec?.projectRef?.name)
          .filter((name): name is string => Boolean(name));

        const projects = await Promise.all(
          linkedProjectNames.map(async (projectName) => {
            try {
              const project = await createProjectService().get(projectName);
              return {
                name: projectName,
                displayName: project.displayName ?? projectName,
                url: `/project/${projectName}/billing`,
              };
            } catch {
              return {
                name: projectName,
                displayName: projectName,
                url: `/project/${projectName}/billing`,
              };
            }
          })
        );

        const accountPaymentMethods = paymentMethods.filter(
          (pm) => pm.spec?.billingAccountRef?.name === billingAccountName
        );
        const defaultPmName = account.spec?.defaultPaymentMethodRef?.name;
        const defaultPaymentMethod = sanitizePaymentMethodSummary(
          accountPaymentMethods.find((pm) => pm.metadata?.name === defaultPmName),
          account
        );

        const contact = account.spec?.contactInfo;
        const address = contact?.address;

        return {
          status: 'ok' as const,
          ...sanitizeBillingAccountSummary(account, projects.length),
          contact: {
            name: contact?.name,
            businessName: contact?.businessName,
            email: contact?.email,
            invoiceEmailCount: contact?.invoiceEmails?.length ?? 0,
          },
          address: address
            ? {
                city: address.city,
                country: address.country,
                region: address.region,
                postalCode: address.postalCode,
              }
            : null,
          taxIds:
            account.spec?.taxIds?.map((tax) => ({
              type: tax.type,
            })) ?? [],
          linkedProjects: projects,
          defaultPaymentMethod,
          paymentMethodCount: accountPaymentMethods.length,
        };
      },
    }),

    getProjectBillingBinding: tool({
      description:
        'Get the billing account that funds a project. Use when the user asks which account pays for the current project.',
      inputSchema: projectIdParam,
      execute: async ({ projectId }: { projectId: string }) => {
        const project = await createProjectService().get(projectId);
        const orgId = project.organizationId;

        const flag = await checkBillingEnabled(orgId);
        if (!flag.enabled) {
          return { status: 'feature-disabled' as const, message: flag.message };
        }

        let bindings;
        try {
          bindings = await createBillingAccountBindingService().list(orgId);
        } catch (err) {
          if (isAuthError(err)) {
            return {
              status: 'insufficient-permissions' as const,
              message: 'You do not have permission to view billing bindings.',
            };
          }
          throw err;
        }

        const binding = bindings.find(
          (b) => isActiveBinding(b) && b.spec?.projectRef?.name === projectId
        );

        if (!binding?.spec?.billingAccountRef?.name) {
          return {
            status: 'no-binding' as const,
            message: 'This project does not have a billing account binding.',
            projectSettingsUrl: `/project/${projectId}/billing`,
          };
        }

        const billingAccountName = binding.spec.billingAccountRef.name;

        try {
          const account = await createBillingAccountService().get(orgId, billingAccountName);
          return {
            status: 'ok' as const,
            projectId,
            projectDisplayName: project.displayName ?? projectId,
            billingAccountName,
            billingAccountDisplayName: getBillingAccountDisplayName(account),
            billingAccountPhase: account.status?.phase ?? 'Provisioning',
            billingAccountReady: isBillingAccountReady(account),
            billingAccountUrl: `/account/billing/${billingAccountName}`,
            projectSettingsUrl: `/project/${projectId}/billing`,
          };
        } catch (err) {
          if (isAuthError(err)) {
            return {
              status: 'insufficient-permissions' as const,
              message: 'You do not have permission to view this billing account.',
            };
          }
          throw err;
        }
      },
    }),

    listPaymentMethods: tool({
      description:
        'List payment methods for an organization, optionally filtered to one billing account. Use when the user asks about cards or payment methods on file.',
      inputSchema: paymentMethodsParam,
      execute: async ({
        orgId,
        billingAccountName,
      }: {
        orgId: string;
        billingAccountName?: string;
      }) => {
        const flag = await checkBillingEnabled(orgId);
        if (!flag.enabled) {
          return { status: 'feature-disabled' as const, message: flag.message, paymentMethods: [] };
        }

        let paymentMethods;
        let accounts;
        try {
          [paymentMethods, accounts] = await Promise.all([
            createPaymentMethodService().list(orgId),
            createBillingAccountService().list(orgId),
          ]);
        } catch (err) {
          if (isAuthError(err)) {
            return {
              status: 'insufficient-permissions' as const,
              message: 'You do not have permission to view payment methods.',
              paymentMethods: [],
            };
          }
          throw err;
        }

        const accountByName = new Map(
          accounts.map((account) => [account.metadata?.name ?? '', account])
        );

        const filtered = billingAccountName
          ? paymentMethods.filter((pm) => pm.spec?.billingAccountRef?.name === billingAccountName)
          : paymentMethods;

        return {
          status: 'ok' as const,
          paymentMethods: filtered.map((pm) =>
            sanitizePaymentMethod(pm, accountByName.get(pm.spec?.billingAccountRef?.name ?? ''))
          ),
          addPaymentMethodUrl: billingAccountName
            ? `/account/billing/${billingAccountName}`
            : '/account/billing',
        };
      },
    }),

    getProjectUsage: tool({
      description:
        'Get metered resource consumption for a project over a time window. Use for billing usage questions — not the same as Prometheus traffic metrics or resource quotas.',
      inputSchema: usageDaysParam,
      execute: async ({ projectId, days }: { projectId: string; days?: number }) => {
        const result = await fetchProjectUsage(projectId, days);

        if (result.status !== 'ok') {
          return {
            status: result.status,
            message:
              result.message ??
              (result.status === 'unconfigured'
                ? 'Usage metering is not configured on this portal.'
                : result.status === 'insufficient-permissions'
                  ? 'You do not have permission to view usage data.'
                  : result.status === 'no-billing-account'
                    ? 'This project does not have a billing account linked.'
                    : 'Usage data is unavailable.'),
            meters: [],
          };
        }

        return {
          status: 'ok' as const,
          projectId,
          days: result.days,
          meters: summarizeMetersForAssistant(result.meters),
          usageDashboardUrl: `/project/${projectId}/usage`,
        };
      },
    }),

    getOrgUsage: tool({
      description:
        'Get org-wide metered resource consumption aggregated across all billing accounts. Use when the user asks about organization-level usage or spend.',
      inputSchema: orgUsageDaysParam,
      execute: async ({ orgId, days }: { orgId: string; days?: number }) => {
        const result = await fetchOrgUsage(orgId, days);

        if (result.status !== 'ok') {
          return {
            status: result.status,
            message:
              result.message ??
              (result.status === 'unconfigured'
                ? 'Usage metering is not configured on this portal.'
                : result.status === 'insufficient-permissions'
                  ? 'You do not have permission to view usage data.'
                  : result.status === 'no-billing-account'
                    ? 'This organization has no billing accounts yet.'
                    : 'Usage data is unavailable.'),
            meters: [],
          };
        }

        return {
          status: 'ok' as const,
          orgId,
          days: result.days,
          meters: summarizeMetersForAssistant(result.meters),
          usageDashboardUrl: `/org/${orgId}/usage`,
        };
      },
    }),
  };
}
