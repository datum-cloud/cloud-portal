export const routes = {
  home: '/',
  auth: {
    logIn: '/login',
    logOut: '/signout',
    signUp: '/signup',
    callback: '/auth/callback',
  },
  action: {
    setTheme: '/action/set-theme',
  },
  account: {
    root: '/account',
    organizations: {
      root: '/orgs',
      new: '/orgs/new',
    },
    projects: '/projects',
    profile: '/account/profile',
    tokens: {
      root: '/account/tokens',
      new: '/account/tokens/new',
    },
    security: '/account/security',
    logs: '/account/logs',
  },
  org: {
    root: '/org/[orgId]',
    dashboard: '/org/[orgId]/dashboard',
    docs: '/org/[orgId]/docs',
    settings: {
      root: '/org/[orgId]/settings',
      general: '/org/[orgId]/settings/general',
      members: '/org/[orgId]/settings/members',
      billing: '/org/[orgId]/settings/billing',
    },
    projects: {
      root: '/org/[orgId]/projects',
      new: '/org/[orgId]/projects/new',
      setup: '/org/[orgId]/projects/setup',
    },
  },
  projects: {
    detail: '/[orgId]/projects/[projectId]',
    dashboard: '/[orgId]/projects/[projectId]/dashboard',
    locations: {
      root: '/[orgId]/projects/[projectId]/locations',
      new: '/[orgId]/projects/[projectId]/locations/new',
      edit: '/[orgId]/projects/[projectId]/locations/[locationId]/edit',
    },
    // Config Sections
    config: {
      root: '/[orgId]/projects/[projectId]/config-maps',
      configMaps: {
        root: '/[orgId]/projects/[projectId]/config-maps',
        new: '/[orgId]/projects/[projectId]/config-maps/new',
        edit: '/[orgId]/projects/[projectId]/config-maps/[configMapId]/edit',
      },
      secrets: {
        root: '/[orgId]/projects/[projectId]/secrets',
        new: '/[orgId]/projects/[projectId]/secrets/new',
        edit: '/[orgId]/projects/[projectId]/secrets/[secretId]/edit',
      },
    },
    // Connect Sections
    connect: {
      root: '/[orgId]/projects/[projectId]/networks',
      networks: {
        root: '/[orgId]/projects/[projectId]/networks',
        new: '/[orgId]/projects/[projectId]/networks/new',
        edit: '/[orgId]/projects/[projectId]/networks/[networkId]/edit',
      },
      gateways: {
        root: '/[orgId]/projects/[projectId]/gateways',
        new: '/[orgId]/projects/[projectId]/gateways/new',
        edit: '/[orgId]/projects/[projectId]/gateways/[gatewayId]/edit',
      },
      httpRoutes: {
        root: '/[orgId]/projects/[projectId]/http-routes',
        new: '/[orgId]/projects/[projectId]/http-routes/new',
        edit: '/[orgId]/projects/[projectId]/http-routes/[httpId]/edit',
      },
      endpointSlices: {
        root: '/[orgId]/projects/[projectId]/endpoint-slices',
        new: '/[orgId]/projects/[projectId]/endpoint-slices/new',
        edit: '/[orgId]/projects/[projectId]/endpoint-slices/[endpointId]/edit',
      },
    },
    // Deploy Sections
    deploy: {
      root: '/[orgId]/projects/[projectId]/workloads',
      workloads: {
        root: '/[orgId]/projects/[projectId]/workloads',
        new: '/[orgId]/projects/[projectId]/workloads/new',
        detail: {
          root: '/[orgId]/projects/[projectId]/workloads/[workloadId]',
          overview: '/[orgId]/projects/[projectId]/workloads/[workloadId]/overview',
          edit: '/[orgId]/projects/[projectId]/workloads/[workloadId]/edit',
        },
      },
      pipelines: {
        root: '/[orgId]/projects/[projectId]/pipelines',
        new: '/[orgId]/projects/[projectId]/pipelines/new',
        edit: '/[orgId]/projects/[projectId]/pipelines/[pipelineId]/edit',
      },
    },
    observe: {
      root: '/[orgId]/projects/[projectId]/export-policies',
      exportPolicies: {
        root: '/[orgId]/projects/[projectId]/export-policies',
        new: '/[orgId]/projects/[projectId]/export-policies/new',
        detail: {
          root: '/[orgId]/projects/[projectId]/export-policies/[exportPolicyId]',
          overview: '/[orgId]/projects/[projectId]/export-policies/[exportPolicyId]/overview',
          edit: '/[orgId]/projects/[projectId]/export-policies/[exportPolicyId]/edit',
        },
      },
    },
    services: '/[orgId]/projects/[projectId]/services',
    metrics: '/[orgId]/projects/[projectId]/metrics',
    logs: '/[orgId]/projects/[projectId]/logs',
    traces: '/[orgId]/projects/[projectId]/traces',
    iam: '/[orgId]/projects/[projectId]/iam-policies',
    roles: '/[orgId]/projects/[projectId]/roles',
    serviceAccounts: '/[orgId]/projects/[projectId]/service-accounts',
    settings: '/[orgId]/projects/[projectId]/settings',
  },
};
