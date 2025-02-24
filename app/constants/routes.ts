export const routes = {
  auth: {
    root: '/auth',
    logIn: '/log-in',
    logOut: '/log-out',
    signUp: '/signup',
    callback: '/auth/[provider]/callback',
    google: '/auth/google',
    github: '/auth/github',
  },
  home: '/',
  org: {
    root: '/[orgId]/dashboard',
    docs: '/[orgId]/docs',
    settings: {
      root: '/[orgId]/settings',
      general: '/[orgId]/settings/general',
      members: '/[orgId]/settings/members',
      billing: '/[orgId]/settings/billing',
    },

    projects: {
      root: '/[orgId]/projects',
      new: '/[orgId]/projects/new',
      setup: '/[orgId]/projects/setup',
    },
  },
  account: {
    root: '/account',
    organizations: {
      root: '/account/organizations',
      new: '/account/organizations/new',
    },
    projects: '/account/projects',
    apiKeys: '/account/api-keys',
    settings: '/account/settings',
  },
  projects: {
    // Main Page of the Project
    detail: '/[orgId]/projects/[projectId]',
    dashboard: '/[orgId]/projects/[projectId]/dashboard',
    locations: {
      root: '/[orgId]/projects/[projectId]/locations',
      new: '/[orgId]/projects/[projectId]/locations/new',
      edit: '/[orgId]/projects/[projectId]/locations/[locationId]/edit',
    },
    networks: {
      root: '/[orgId]/projects/[projectId]/networks',
      new: '/[orgId]/projects/[projectId]/networks/new',
      edit: '/[orgId]/projects/[projectId]/networks/[networkId]/edit',
    },
    gateways: '/[orgId]/projects/[projectId]/gateways',
    services: '/[orgId]/projects/[projectId]/services',
    workloads: '/[orgId]/projects/[projectId]/workloads',
    pipelines: '/[orgId]/projects/[projectId]/pipelines',
    metrics: '/[orgId]/projects/[projectId]/metrics',
    logs: '/[orgId]/projects/[projectId]/logs',
    traces: '/[orgId]/projects/[projectId]/traces',
    exporters: '/[orgId]/projects/[projectId]/exporters',
    iam: '/[orgId]/projects/[projectId]/iam-policies',
    roles: '/[orgId]/projects/[projectId]/roles',
    serviceAccounts: '/[orgId]/projects/[projectId]/service-accounts',
    settings: '/[orgId]/projects/[projectId]/settings',
  },
}
