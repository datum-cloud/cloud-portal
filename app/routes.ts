import { type RouteConfig, index, layout, prefix, route } from '@react-router/dev/routes';

const publicRoutes = [
  layout('layouts/public.layout.tsx', [
    route('login', 'pages/auth/login.tsx'),
    route('signup', 'pages/auth/signup.tsx'),
    route('auth/callback', 'pages/auth/callback.tsx'),
  ]),
];

const privateRoutes = [
  layout('layouts/private.layout.tsx', [
    index('pages/index.tsx'),

    // Account Routes
    layout('layouts/account.layout.tsx', [
      route('orgs', 'pages/account/organizations/layout.tsx', [
        index('pages/account/organizations/index.tsx'),
        route('new', 'pages/account/organizations/new.tsx'),
      ]),
      route('projects', 'pages/account/projects.tsx'),

      route('account', 'pages/account/settings/layout.tsx', [
        index('pages/account/settings/index.tsx'),
        route('profile', 'pages/account/settings/profile.tsx'),
        route('tokens', 'pages/account/settings/tokens.tsx'),
        route('security', 'pages/account/settings/security.tsx'),
        route('logs', 'pages/account/settings/logs.tsx'),
      ]),
    ]),

    // Organization Routes
    route('org/:orgId', 'layouts/organization.layout.tsx', [
      index('pages/organization/index.tsx'),
      route('dashboard', 'pages/organization/dashboard.tsx'),
      route('projects', 'pages/organization/projects.tsx'),
      route('settings', 'pages/organization/settings.tsx'),
    ]),
  ]),
];

const apiRoutes = [];

export default [
  ...publicRoutes,
  ...privateRoutes,

  route('signout', 'pages/auth/signout.tsx'),

  ...prefix('action', [route('set-theme', 'pages/action/set-theme.tsx')]),
] as RouteConfig;
