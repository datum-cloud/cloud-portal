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
      new: '/account/organizations/new',
    },
    projects: '/account/projects',
    apiKeys: {
      root: '/account/api-keys',
      new: '/account/api-keys/new',
    },
    preferences: '/account/preferences',
    activity: '/account/activity',
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
        new: '/org/[orgId]/projects/new',
      },
      policyBindings: {
        root: '/org/[orgId]/policy-bindings',
        new: '/org/[orgId]/policy-bindings/new',
        edit: '/org/[orgId]/policy-bindings/[policyBindingId]/edit',
      },
      settings: {
        preferences: '/org/[orgId]/preferences',
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
            edit: '/project/[projectId]/secrets/[secretId]/edit',
          },
        },
      },
      httpProxy: {
        root: '/project/[projectId]/httpproxy',
        new: '/project/[projectId]/httpproxy/new',
        detail: {
          root: '/project/[projectId]/httpproxy/[proxyId]',
          overview: '/project/[projectId]/httpproxy/[proxyId]/overview',
          edit: '/project/[projectId]/httpproxy/[proxyId]/edit',
          grafana: '/project/[projectId]/httpproxy/[proxyId]/grafana',
          metrics: '/project/[projectId]/httpproxy/[proxyId]/metrics',
        },
      },
      domains: {
        root: '/project/[projectId]/domains',
        new: '/project/[projectId]/domains/new',
        detail: {
          root: '/project/[projectId]/domains/[domainId]',
          overview: '/project/[projectId]/domains/[domainId]/overview',
          edit: '/project/[projectId]/domains/[domainId]/edit',
        },
      },
      dnsZones: {
        root: '/project/[projectId]/dns-zones',
        new: '/project/[projectId]/dns-zones/new',
        edit: '/project/[projectId]/dns-zones/[dnsZoneId]/edit',
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
        preferences: '/project/[projectId]/preferences',
        quotas: '/project/[projectId]/quotas',
        activity: '/project/[projectId]/activity',
      },
    },
  },
};
