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
  waitlist: '/waitlist',
  invitationAccept: '/invitation/:invitationId/accept',
  account: {
    root: '/account',
    organizations: {
      root: '/account/organizations',
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
      },
      projects: {
        root: '/org/[orgId]/projects',
      },
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
      config: {
        root: '/project/[projectId]/secrets',
        secrets: {
          root: '/project/[projectId]/secrets',
          new: '/project/[projectId]/secrets/new',
          detail: {
            root: '/project/[projectId]/secrets/[secretId]',
            overview: '/project/[projectId]/secrets/[secretId]/overview',
          },
        },
      },
      proxy: {
        root: '/project/[projectId]/edge',
        detail: {
          root: '/project/[projectId]/edge/[proxyId]',
          overview: '/project/[projectId]/edge/[proxyId]/overview',
        },
      },
      domains: {
        root: '/project/[projectId]/domains',
        detail: {
          root: '/project/[projectId]/domains/[domainId]',
          overview: '/project/[projectId]/domains/[domainId]/overview',
          settings: '/project/[projectId]/domains/[domainId]/settings',
        },
      },
      dnsZones: {
        root: '/project/[projectId]/dns-zones',
        new: '/project/[projectId]/dns-zones/new',
        detail: {
          root: '/project/[projectId]/dns-zones/[dnsZoneId]',
          overview: '/project/[projectId]/dns-zones/[dnsZoneId]/overview',
          dnsRecords: '/project/[projectId]/dns-zones/[dnsZoneId]/dns-records',
          nameservers: '/project/[projectId]/dns-zones/[dnsZoneId]/nameservers',
          settings: '/project/[projectId]/dns-zones/[dnsZoneId]/settings',
        },
      },
      metrics: {
        root: '/project/[projectId]/export-policies',
        exportPolicies: {
          root: '/project/[projectId]/export-policies',
          new: '/project/[projectId]/export-policies/new',
          detail: {
            root: '/project/[projectId]/export-policies/[exportPolicyId]',
            overview: '/project/[projectId]/export-policies/[exportPolicyId]/overview',
            edit: '/project/[projectId]/export-policies/[exportPolicyId]/edit',
          },
        },
      },
      activity: '/project/[projectId]/activity',
      quotas: '/project/[projectId]/quotas',
      settings: {
        general: '/project/[projectId]/general',
        notifications: '/project/[projectId]/notifications',
        quotas: '/project/[projectId]/quotas',
        activity: '/project/[projectId]/activity',
      },
    },
  },
};
