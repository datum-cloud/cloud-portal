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
    route('test/permissions', 'routes/test/permissions.tsx'),
    route('test/demo', 'routes/test/demo.tsx'),
    route('test/dns-record', 'routes/test/dns-record/dns-record.tsx'),

    // Invitation
    route('invitation/:invitationId/accept', 'routes/invitation/index.tsx'),

    // Waitlist
    route('waitlist', 'routes/waitlist/index.tsx'),

    // Account
    route('account', 'routes/account/layout.tsx', [
      index('routes/account/index.tsx'),

      // Account Organizations
      route('organizations', 'routes/account/organizations/layout.tsx', [
        index('routes/account/organizations/index.tsx'),
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

        // Team of an organization
        route('team', 'routes/org/detail/team/layout.tsx', [
          index('routes/org/detail/team/index.tsx'),
          route('invite', 'routes/org/detail/team/invite.tsx'),
        ]),

        // Policy Bindings of an organization
        /* route('policy-bindings/new', 'routes/org/detail/policy-bindings/new.tsx'),
        route(
          'policy-bindings/:policyBindingId/edit',
          'routes/org/detail/policy-bindings/edit.tsx'
        ), */

        // Settings of an organization
        layout('routes/org/detail/settings/layout.tsx', [
          route('general', 'routes/org/detail/settings/general.tsx'),
          // route('quotas', 'routes/org/detail/settings/quotas.tsx'),
          route('activity', 'routes/org/detail/settings/activity.tsx'),
          // route('policy-bindings', 'routes/org/detail/settings/policy-bindings.tsx'),
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

        // Settings of an organization
        layout('routes/project/detail/settings/layout.tsx', [
          route('preferences', 'routes/project/detail/settings/preferences.tsx'),
          // route('quotas', 'routes/project/detail/settings/quotas.tsx'),
          route('activity', 'routes/project/detail/settings/activity.tsx'),
        ]),

        // Edge Group
        layout('routes/project/detail/edge/layout.tsx', [
          // DNS Zones
          route('dns-zones', 'routes/project/detail/edge/dns-zones/layout.tsx', [
            index('routes/project/detail/edge/dns-zones/index.tsx'),
            route('new', 'routes/project/detail/edge/dns-zones/new.tsx'),
            route(
              ':dnsZoneId',
              'routes/project/detail/edge/dns-zones/detail/layout.tsx',
              { id: 'dns-zone-detail' },
              [
                index('routes/project/detail/edge/dns-zones/detail/index.tsx'),
                route('overview', 'routes/project/detail/edge/dns-zones/detail/overview.tsx'),
                route('dns-records', 'routes/project/detail/edge/dns-zones/detail/dns-records.tsx'),
                route('nameservers', 'routes/project/detail/edge/dns-zones/detail/nameservers.tsx'),
                route('settings', 'routes/project/detail/edge/dns-zones/detail/settings.tsx'),
              ]
            ),
          ]),

          // Proxies
          route('proxy', 'routes/project/detail/edge/proxy/layout.tsx', [
            index('routes/project/detail/edge/proxy/index.tsx'),
            route('new', 'routes/project/detail/edge/proxy/new.tsx'),

            route(
              ':proxyId',
              'routes/project/detail/edge/proxy/detail/layout.tsx',
              { id: 'proxy-detail' },
              [
                index('routes/project/detail/edge/proxy/detail/index.tsx'),
                route('grafana', 'routes/project/detail/edge/proxy/detail/grafana.tsx'),
                route('edit', 'routes/project/detail/edge/proxy/detail/edit.tsx'),

                route('', 'routes/project/detail/edge/proxy/detail/tabs/layout.tsx', [
                  // Tabs Layout
                  route('overview', 'routes/project/detail/edge/proxy/detail/tabs/overview.tsx'),
                  route('metrics', 'routes/project/detail/edge/proxy/detail/tabs/metrics.tsx'),
                ]),
              ]
            ),
          ]),
        ]),

        // Workflows Group
        layout('routes/project/detail/metrics/layout.tsx', [
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

        // Assets Group
        layout('routes/project/detail/config/layout.tsx', [
          // Domains
          route('domains', 'routes/project/detail/config/domains/layout.tsx', [
            index('routes/project/detail/config/domains/index.tsx'),
            route('new', 'routes/project/detail/config/domains/new.tsx'),

            route(
              ':domainId',
              'routes/project/detail/config/domains/detail/layout.tsx',
              { id: 'domain-detail' },
              [
                index('routes/project/detail/config/domains/detail/index.tsx'),
                route('overview', 'routes/project/detail/config/domains/detail/overview.tsx'),
                // route('edit', 'routes/project/detail/config/domains/detail/edit.tsx'),
              ]
            ),
          ]),

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

      // Team
      route('team/invitations/cancel', 'routes/api/team/invitations/cancel.ts'),
      route('team/invitations/resend', 'routes/api/team/invitations/resend.ts'),
      route('team/invitations/update-state', 'routes/api/team/invitations/update-state.ts'),

      // Members
      route('members', 'routes/api/members/index.ts'),
      route('members/leave', 'routes/api/members/leave.ts'),

      // Domains
      route('domains', 'routes/api/domains/index.ts'),
      route('domains/refresh', 'routes/api/domains/refresh.ts'),
      route('domains/:id/status', 'routes/api/domains/status.ts'),

      // DNS Zones
      route('dns-zones', 'routes/api/dns-zones/index.ts'),

      // HTTPProxies
      route('proxy', 'routes/api/proxy/index.ts'),
      route('proxy/:id', 'routes/api/proxy/$id.ts'),

      // Export Policies
      route('export-policies', 'routes/api/export-policies/index.ts'),
      route('export-policies/:id/status', 'routes/api/export-policies/status.ts'),

      // Secrets
      route('secrets', 'routes/api/secrets/index.ts'),

      // Activities
      route('activity', 'routes/api/activity/index.ts'),

      // Policy Bindings
      // route('policy-bindings', 'routes/api/policy-bindings/index.ts'),

      // Groups
      route('groups', 'routes/api/groups/index.ts'),

      // Roles
      route('roles', 'routes/api/roles/index.ts'),

      // DNS Records
      route('dns-records', 'routes/api/dns-records/index.ts'),
      route('dns-records/bulk-import', 'routes/api/dns-records/bulk-import.ts'),
      route('dns-records/:id', 'routes/api/dns-records/$id.ts'),
      route('dns-records/:id/status', 'routes/api/dns-records/status.ts'),

      // DNS Zone Discoveries
      route('dns-zone-discoveries', 'routes/api/dns-zone-discoveries/index.ts'),
      route('dns-zone-discoveries/:id', 'routes/api/dns-zone-discoveries/$id.ts'),

      // Third-party APIs
      // Cloud Validations
      route('cloudvalid/dns', 'routes/api/cloudvalid/dns.ts'),

      // Telemetry
      route('telemetry/grafana', 'routes/api/telemetry/grafana.ts'),

      // Prometheus
      route('prometheus', 'routes/api/prometheus/index.ts'),

      // Permissions
      route('permissions/check', 'routes/api/permissions/check.ts'),
      route('permissions/bulk-check', 'routes/api/permissions/bulk-check.ts'),

      // Notifications
      route('notifications', 'routes/api/notifications/index.ts'),
    ]),
  ]),

  // Auth
  ...prefix('auth', [
    index('routes/auth/index.tsx'),
    route('callback', 'routes/auth/callback.tsx'),
  ]),

  // Global Routes
  route('logout', 'routes/auth/logout.tsx', { id: 'logout' }),

  // Catch-all route for 404 errors - must be last
  route('*', 'routes/not-found.tsx'),
] as RouteConfig;
