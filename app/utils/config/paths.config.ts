export const paths = {
  auth: {
    root: '/auth',
    logIn: '/login',
    logOut: '/logout',
    signUp: '/signup',
    callback: '/auth/callback',
  },
  home: '/',
  gettingStarted: '/getting-started',
  onboarding: {
    root: '/onboarding',
    profile: '/onboarding/profile',
    account: '/onboarding/account',
    billing: '/onboarding/billing',
    provisioning: '/onboarding/provisioning',
  },
  fraud: {
    verifying: '/verifying',
    accountUnderReview: '/account-under-review',
    accountSuspended: '/account-suspended',
    statusApi: '/api/fraud-status',
  },
  invitationAccept: '/invitation/:invitationId/accept',
  account: {
    root: '/account',
    organizations: {
      root: '/account/organizations',
    },
    // User-level billing accounts. Aggregates accounts across every org the
    // signed-in user is a member of, so management actions (addresses,
    // invoices, credits, payment methods, recipients) live here instead of
    // under each org. The org-level `/org/[orgId]/billing` page is now a
    // thin "which account funds this org's projects" switcher and deep-links
    // into these pages for actual management.
    billing: {
      root: '/account/billing',
      detail: {
        root: '/account/billing/[billingAccountId]',
      },
    },
    // Account Settings
    settings: {
      general: '/account/general',
      security: '/account/security',
      activeSessions: '/account/active-sessions',
      accessTokens: '/account/access-tokens',
      notifications: '/account/notifications',
      activity: '/account/activity',
    },
  },
  org: {
    root: '/org',
    detail: {
      root: '/org/[orgId]',
      team: {
        root: '/org/[orgId]/team',
        invite: '/org/[orgId]/team/invite',
        roles: '/org/[orgId]/team/[memberId]/roles',
        groups: '/org/[orgId]/team/groups',
        groupDetail: '/org/[orgId]/team/groups/[groupId]',
      },
      projects: {
        root: '/org/[orgId]/projects',
      },
      // Org-level billing is now a thin per-org switcher — actual account
      // management lives under `paths.account.billing` (user-level). The
      // `[billingAccountId]` segment is kept only for a backwards-compat
      // redirect for old bookmarks; new code should link to
      // `paths.account.billing.detail.root` instead.
      billing: {
        root: '/org/[orgId]/billing',
      },
      // Org-wide metering dashboard. Aggregates usage across every billing
      // account in the org's namespace; gated by the same
      // `UsageMeteringDashboard` flag as the per-project view.
      usage: '/org/[orgId]/usage',
      policyBindings: {
        root: '/org/[orgId]/policy-bindings',
        new: '/org/[orgId]/policy-bindings/new',
        edit: '/org/[orgId]/policy-bindings/[policyBindingId]/edit',
      },
      settings: {
        general: '/org/[orgId]/general',
        notifications: '/org/[orgId]/notifications',
        quotas: '/org/[orgId]/quotas',
        activity: '/org/[orgId]/activity',
      },
    },
  },
  project: {
    root: '/project',
    detail: {
      root: '/project/[projectId]',
      home: '/project/[projectId]/home',
      secrets: {
        root: '/project/[projectId]/secrets',
        detail: {
          root: '/project/[projectId]/secrets/[secretId]',
          overview: '/project/[projectId]/secrets/[secretId]/overview',
          activity: '/project/[projectId]/secrets/[secretId]/activity',
        },
      },
      proxy: {
        root: '/project/[projectId]/edge',
        detail: {
          root: '/project/[projectId]/edge/[proxyId]',
          overview: '/project/[projectId]/edge/[proxyId]/overview',
          activity: '/project/[projectId]/edge/[proxyId]/activity',
        },
      },
      domains: {
        root: '/project/[projectId]/domains',
        detail: {
          root: '/project/[projectId]/domains/[domainId]',
          overview: '/project/[projectId]/domains/[domainId]/overview',
          activity: '/project/[projectId]/domains/[domainId]/activity',
          settings: '/project/[projectId]/domains/[domainId]/settings',
        },
      },
      dnsZones: {
        root: '/project/[projectId]/dns-zones',
        detail: {
          root: '/project/[projectId]/dns-zones/[dnsZoneId]',
          // overview: '/project/[projectId]/dns-zones/[dnsZoneId]/overview',
          discovery: '/project/[projectId]/dns-zones/[dnsZoneId]/discovery',
          dnsRecords: '/project/[projectId]/dns-zones/[dnsZoneId]/dns-records',
          nameservers: '/project/[projectId]/dns-zones/[dnsZoneId]/nameservers',
          activity: '/project/[projectId]/dns-zones/[dnsZoneId]/activity',
          settings: '/project/[projectId]/dns-zones/[dnsZoneId]/settings',
        },
      },
      metrics: {
        root: '/project/[projectId]/export-policies',
        new: '/project/[projectId]/export-policies/new',
        detail: {
          root: '/project/[projectId]/export-policies/[exportPolicyId]',
          overview: '/project/[projectId]/export-policies/[exportPolicyId]/overview',
          activity: '/project/[projectId]/export-policies/[exportPolicyId]/activity',
          settings: '/project/[projectId]/export-policies/[exportPolicyId]/settings',
        },
      },
      connectors: {
        root: '/project/[projectId]/connectors',
        detail: {
          root: '/project/[projectId]/connectors/[connectorId]',
        },
      },
      activity: '/project/[projectId]/activity',
      quotas: '/project/[projectId]/quotas',
      usage: '/project/[projectId]/usage',
      settings: {
        general: '/project/[projectId]/general',
        notifications: '/project/[projectId]/notifications',
        quotas: '/project/[projectId]/quotas',
        billing: '/project/[projectId]/billing',
        activity: '/project/[projectId]/activity',
      },
      serviceAccounts: {
        root: '/project/[projectId]/service-accounts',
        new: '/project/[projectId]/service-accounts/new',
        detail: {
          root: '/project/[projectId]/service-accounts/[serviceAccountId]',
          overview: '/project/[projectId]/service-accounts/[serviceAccountId]/overview',
          keys: '/project/[projectId]/service-accounts/[serviceAccountId]/keys',
          policyBindings:
            '/project/[projectId]/service-accounts/[serviceAccountId]/policy-bindings',
          activity: '/project/[projectId]/service-accounts/[serviceAccountId]/activity',
          settings: '/project/[projectId]/service-accounts/[serviceAccountId]/settings',
        },
      },
    },
  },
};
