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

    // Account
    route('account', 'routes/account/layout.tsx', [
      index('routes/account/index.tsx'),

      // Account Organizations
      route('organizations', 'routes/account/organizations/layout.tsx', [
        index('routes/account/organizations/index.tsx'),
      ]),

      // Account General
      layout('routes/account/settings/layout.tsx', [
        route('general', 'routes/account/settings/general.tsx'),
        route('security', 'routes/account/settings/security.tsx'),
        route('active-sessions', 'routes/account/settings/active-sessions.tsx'),
        route('access-tokens', 'routes/account/settings/access-tokens.tsx'),
        route('notifications', 'routes/account/settings/notifications.tsx'),
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
        ]),

        // Team of an organization
        route('team', 'routes/org/detail/team/layout.tsx', [
          layout('routes/org/detail/team/list-layout.tsx', [
            index('routes/org/detail/team/index.tsx'),
            route('groups', 'routes/org/detail/team/groups.tsx'),
            route('groups/:groupId', 'routes/org/detail/team/group-detail.tsx'),
          ]),
          route('invite', 'routes/org/detail/team/invite.tsx'),
          route(':memberId/roles', 'routes/org/detail/team/member-roles.tsx'),
        ]),

        // Settings of an organization
        layout('routes/org/detail/settings/layout.tsx', [
          route('general', 'routes/org/detail/settings/general.tsx'),
          route('notifications', 'routes/org/detail/settings/notifications.tsx'),
          route('quotas', 'routes/org/detail/settings/quotas.tsx'),
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

        // Settings
        layout('routes/project/detail/settings/layout.tsx', [
          route('general', 'routes/project/detail/settings/general.tsx'),
          route('notifications', 'routes/project/detail/settings/notifications.tsx'),
          route('quotas', 'routes/project/detail/settings/quotas.tsx'),
          route('activity', 'routes/project/detail/settings/activity.tsx'),
        ]),

        // AI Edge
        route('edge', 'routes/project/detail/edge/layout.tsx', [
          index('routes/project/detail/edge/index.tsx'),

          route(
            ':proxyId',
            'routes/project/detail/edge/detail/layout.tsx',
            { id: 'proxy-detail' },
            [index('routes/project/detail/edge/detail/index.tsx')]
          ),
        ]),

        // Connectors
        route('connectors', 'routes/project/detail/connectors/layout.tsx', [
          index('routes/project/detail/connectors/index.tsx'),
        ]),

        // DNS Zones
        route('dns-zones', 'routes/project/detail/dns-zones/layout.tsx', [
          index('routes/project/detail/dns-zones/index.tsx'),
          route(':dnsZoneId/discovery', 'routes/project/detail/dns-zones/discovery.tsx'),
          route(
            ':dnsZoneId',
            'routes/project/detail/dns-zones/detail/layout.tsx',
            { id: 'dns-zone-detail' },
            [
              index('routes/project/detail/dns-zones/detail/index.tsx'),
              // route('overview', 'routes/project/detail/dns-zones/detail/overview.tsx'),
              route('dns-records', 'routes/project/detail/dns-zones/detail/dns-records.tsx'),
              route('nameservers', 'routes/project/detail/dns-zones/detail/nameservers.tsx'),
              route('settings', 'routes/project/detail/dns-zones/detail/settings.tsx'),
            ]
          ),
        ]),

        // Domains
        route('domains', 'routes/project/detail/domains/layout.tsx', [
          index('routes/project/detail/domains/index.tsx'),

          route(
            ':domainId',
            'routes/project/detail/domains/detail/layout.tsx',
            { id: 'domain-detail' },
            [
              index('routes/project/detail/domains/detail/index.tsx'),
              route('overview', 'routes/project/detail/domains/detail/overview.tsx'),
              route('settings', 'routes/project/detail/domains/detail/settings.tsx'),
            ]
          ),
        ]),

        // Metrics (Export Policies)
        route('export-policies', 'routes/project/detail/metrics/layout.tsx', [
          index('routes/project/detail/metrics/index.tsx'),
          route('new', 'routes/project/detail/metrics/new.tsx'),

          route(
            ':exportPolicyId',
            'routes/project/detail/metrics/detail/layout.tsx',
            { id: 'export-policy-detail' },
            [
              index('routes/project/detail/metrics/detail/index.tsx'),
              route('overview', 'routes/project/detail/metrics/detail/overview.tsx'),
              route('edit', 'routes/project/detail/metrics/detail/edit.tsx'),
            ]
          ),
        ]),

        // Machine Accounts
        route('machine-accounts', 'routes/project/detail/machine-accounts/layout.tsx', [
          index('routes/project/detail/machine-accounts/index.tsx'),
          route(
            ':machineAccountId',
            'routes/project/detail/machine-accounts/detail/layout.tsx',
            { id: 'machine-account-detail' },
            [
              route('overview', 'routes/project/detail/machine-accounts/detail/overview.tsx'),
              route('keys', 'routes/project/detail/machine-accounts/detail/keys.tsx'),
              route(
                'policy-bindings',
                'routes/project/detail/machine-accounts/detail/policy-bindings.tsx'
              ),
              route('activity', 'routes/project/detail/machine-accounts/detail/activity.tsx'),
            ]
          ),
        ]),

        // Secrets
        route('secrets', 'routes/project/detail/secrets/layout.tsx', [
          index('routes/project/detail/secrets/index.tsx'),
          route(
            ':secretId',
            'routes/project/detail/secrets/detail/layout.tsx',
            { id: 'secret-detail' },
            [
              index('routes/project/detail/secrets/detail/index.tsx'),
              route('overview', 'routes/project/detail/secrets/detail/overview.tsx'),
            ]
          ),
        ]),
      ]),
    ]),
  ]),

  // Auth
  ...prefix('auth', [
    index('routes/auth/index.tsx'),
    route('callback', 'routes/auth/callback.tsx'),
  ]),

  // Onboarding (outside private layout — BlankLayout + own loader auth)
  route('complete-profile', 'routes/onboarding/complete-profile.tsx'),

  // Fraud / gating routes — outside the private layout because the private layout loader fetches
  // the user and would throw NotFoundError for brand-new users not yet in Milo.
  // These pages use BlankLayout and handle their own auth checks.
  // The /api/fraud-status polling endpoint is handled by the Hono server (app/server/routes/fraud-status.ts).
  route('verifying', 'routes/fraud/verifying.tsx'),
  route('account-under-review', 'routes/fraud/account-under-review.tsx'),
  route('account-suspended', 'routes/fraud/account-suspended.tsx'),
  // Global Routes
  route('logout', 'routes/auth/logout.tsx', { id: 'logout' }),

  // Catch-all route for 404 errors - must be last
  route('*', 'routes/not-found.tsx'),
] as RouteConfig;
