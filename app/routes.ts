import { type RouteConfig, index, layout, prefix, route } from '@react-router/dev/routes';

export default [
  // Public Routes
  layout('layouts/public.layout.tsx', [
    // Auth
    route('login', 'routes/auth/login.tsx', { id: 'login' }),
    route('signup', 'routes/auth/login.tsx', { id: 'signup' }),
  ]),

  // Protected Routes with auth
  layout('layouts/private.layout.tsx', [
    index('routes/index.tsx'),

    // Test Playground
    route('test/metrics', 'routes/test/metrics.tsx'),
    route('test/sentry', 'routes/test/sentry.tsx'),

    // Getting Started
    route('getting-started', 'routes/getting-started/index.tsx'),

    // Account
    route('account', 'routes/account/layout.tsx', [
      index('routes/account/index.tsx'),

      // Account Organizations
      route('organizations', 'routes/account/organizations/layout.tsx', [
        index('routes/account/organizations/index.tsx'),
        route('new', 'routes/account/organizations/new.tsx'),
      ]),

      // Account Preferences
      layout('routes/account/settings/layout.tsx', [
        route('preferences', 'routes/account/settings/preferences.tsx'),
        route('activity', 'routes/account/settings/activity.tsx'),
      ]),
    ]),

    // Org
    route('org', 'routes/org/layout.tsx', [
      index('routes/org/index.tsx'),

      // Org Detail
      route(':orgId', 'routes/org/detail/layout.tsx', { id: 'org-detail' }, [
        index('routes/org/detail/index.tsx'),

        // Projects of an organization
        route('projects', 'routes/org/detail/projects/layout.tsx', [
          index('routes/org/detail/projects/index.tsx'),
          route('new', 'routes/org/detail/projects/new.tsx'),
        ]),

        // Settings of an organization
        layout('routes/org/detail/settings/layout.tsx', [
          route('preferences', 'routes/org/detail/settings/preferences.tsx'),
          route('policy-bindings', 'routes/org/detail/settings/policy-bindings.tsx'),
          route('activity', 'routes/org/detail/settings/activity.tsx'),
        ]),
      ]),
    ]),

    // Project
    route('project', 'routes/project/layout.tsx', [
      index('routes/project/index.tsx'),

      // Project Detail
      route(':projectId', 'routes/project/detail/layout.tsx', { id: 'project-detail' }, [
        index('routes/project/detail/index.tsx'),

        route('home', 'routes/project/detail/home.tsx'),
        route('activity', 'routes/project/detail/activity.tsx'),
        route('settings', 'routes/project/detail/settings.tsx'),

        // Config
        route('secrets', 'routes/project/detail/config/secrets/layout.tsx', [
          index('routes/project/detail/config/secrets/index.tsx'),
          route('new', 'routes/project/detail/config/secrets/new.tsx'),
          route(
            ':secretId',
            'routes/project/detail/config/secrets/detail/layout.tsx',
            { id: 'secret-detail' },
            [
              index('routes/project/detail/config/secrets/detail/index.tsx'),
              route('edit', 'routes/project/detail/config/secrets/detail/edit.tsx'),
            ]
          ),
        ]),

        // HTTPProxy
        route('httpproxy', 'routes/project/detail/edge/httpproxy/layout.tsx', [
          index('routes/project/detail/edge/httpproxy/index.tsx'),
          route('new', 'routes/project/detail/edge/httpproxy/new.tsx'),

          route(
            ':proxyId',
            'routes/project/detail/edge/httpproxy/detail/layout.tsx',
            { id: 'httpproxy-detail' },
            [
              index('routes/project/detail/edge/httpproxy/detail/index.tsx'),
              route('grafana', 'routes/project/detail/edge/httpproxy/detail/grafana.tsx'),
              route('edit', 'routes/project/detail/edge/httpproxy/detail/edit.tsx'),

              route('', 'routes/project/detail/edge/httpproxy/detail/tabs/layout.tsx', [
                // Tabs Layout
                route('overview', 'routes/project/detail/edge/httpproxy/detail/tabs/overview.tsx'),
                route('metrics', 'routes/project/detail/edge/httpproxy/detail/tabs/metrics.tsx'),
              ]),
            ]
          ),
        ]),

        // Domains
        route('domains', 'routes/project/detail/edge/domains/layout.tsx', [
          index('routes/project/detail/edge/domains/index.tsx'),
          route('new', 'routes/project/detail/edge/domains/new.tsx'),

          route(
            ':domainId',
            'routes/project/detail/edge/domains/detail/layout.tsx',
            { id: 'domain-detail' },
            [
              index('routes/project/detail/edge/domains/detail/index.tsx'),
              route('overview', 'routes/project/detail/edge/domains/detail/overview.tsx'),
              // route('edit', 'routes/project/detail/edge/domains/detail/edit.tsx'),
            ]
          ),
        ]),

        // Export Policies
        route('export-policies', 'routes/project/detail/metrics/export-policies/layout.tsx', [
          index('routes/project/detail/metrics/export-policies/index.tsx'),
          route('new', 'routes/project/detail/metrics/export-policies/new.tsx'),

          route(
            ':exportPolicyId',
            'routes/project/detail/metrics/export-policies/detail/layout.tsx',
            { id: 'export-policy-detail' },
            [
              index('routes/project/detail/metrics/export-policies/detail/index.tsx'),
              route(
                'overview',
                'routes/project/detail/metrics/export-policies/detail/overview.tsx'
              ),
              route('edit', 'routes/project/detail/metrics/export-policies/detail/edit.tsx'),
            ]
          ),
        ]),
      ]),
    ]),
  ]),

  // API
  ...prefix('api', [
    // Public APIs
    route('set-theme', 'routes/api/action/set-theme.ts'),
    route('set-cache', 'routes/api/action/set-cache.ts'),

    // Private APIs (with auth middleware)
    layout('layouts/private.layout.tsx', { id: 'private-api' }, [
      // User
      route('user', 'routes/api/user/index.ts'),
      route('user/preferences', 'routes/api/user/preferences.ts'),

      // Organizations
      route('organizations', 'routes/api/organizations/index.ts'),
      route('organizations/:id', 'routes/api/organizations/$id.ts'),

      // Projects
      route('projects', 'routes/api/projects/index.ts'),
      route('projects/:id/status', 'routes/api/projects/status.ts'),

      // Domains
      route('domains', 'routes/api/domains/index.ts'),
      route('domains/:id/status', 'routes/api/domains/status.ts'),

      // HTTPProxies
      route('httpproxy', 'routes/api/httpproxy/index.ts'),
      route('httpproxy/:id', 'routes/api/httpproxy/$id.ts'),

      // Export Policies
      route('export-policies', 'routes/api/export-policies/index.ts'),
      route('export-policies/:id/status', 'routes/api/export-policies/status.ts'),

      // Secrets
      route('secrets', 'routes/api/secrets/index.ts'),

      // Activities
      route('activity', 'routes/api/activity/index.ts'),

      // Third-party APIs
      // Cloud Validations
      route('cloudvalid/dns', 'routes/api/cloudvalid/dns.ts'),

      // Telemetry
      route('telemetry/grafana', 'routes/api/telemetry/grafana.ts'),

      // Prometheus
      route('prometheus', 'routes/api/prometheus/index.ts'),
    ]),
  ]),

  // Global Routes
  route('logout', 'routes/auth/logout.tsx', { id: 'logout' }),
  ...prefix('auth', [
    index('routes/auth/index.tsx'),
    route('callback', 'routes/auth/callback.tsx'),
  ]),

  // Catch-all route for 404 errors - must be last
  route('*', 'routes/not-found.tsx'),
] as RouteConfig;
