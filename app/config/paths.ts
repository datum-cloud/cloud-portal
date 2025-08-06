export const paths = {
  auth: {
    root: '/auth',
    logIn: '/login',
    logOut: '/logout',
    signUp: '/signup',
    callback: '/auth/callback',
  },
  home: '/',
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
      projects: {
        root: '/org/[orgId]/projects',
        new: '/org/[orgId]/projects/new',
      },
      settings: {
        preferences: '/org/[orgId]/preferences',
        activity: '/org/[orgId]/activity',
      },
    },
  },
  project: {
    root: '/project',
    detail: {
      root: '/project/[projectId]',
      home: '/project/[projectId]/home',
      httpProxy: {
        root: '/project/[projectId]/httpproxy',
        new: '/project/[projectId]/httpproxy/new',
        detail: {
          root: '/project/[projectId]/httpproxy/[proxyId]',
          overview: '/project/[projectId]/httpproxy/[proxyId]/overview',
          edit: '/project/[projectId]/httpproxy/[proxyId]/edit',
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
      settings: '/project/[projectId]/settings',
    },
  },

  /** @deprecated use `project` instead */
  projects: {
    detail: '/project/[projectId]',
    dashboard: '/project/[projectId]/home',
    locations: {
      root: '/project/[projectId]/locations',
      new: '/project/[projectId]/locations/new',
      edit: '/project/[projectId]/locations/[locationId]/edit',
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
        detail: {
          root: '/[orgId]/projects/[projectId]/networks/[networkId]',
          overview: '/[orgId]/projects/[projectId]/networks/[networkId]/overview',
          edit: '/[orgId]/projects/[projectId]/networks/[networkId]/edit',
        },
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
    internetEdge: {
      root: '/[orgId]/projects/[projectId]/httpproxy',
      httpProxy: {
        root: '/[orgId]/projects/[projectId]/httpproxy',
        new: '/[orgId]/projects/[projectId]/httpproxy/new',
        detail: {
          root: '/[orgId]/projects/[projectId]/httpproxy/[proxyId]',
          overview: '/[orgId]/projects/[projectId]/httpproxy/[proxyId]/overview',
          edit: '/[orgId]/projects/[projectId]/httpproxy/[proxyId]/edit',
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
    activity: '/[orgId]/projects/[projectId]/activity',
    settings: '/[orgId]/projects/[projectId]/settings',
  },
};
