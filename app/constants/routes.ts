export const routes = {
  auth: {
    root: '/auth',
    signIn: '/auth/sign-in',
    signOut: '/auth/sign-out',
    callback: (provider: string) => `/auth/${provider}/callback`,
    google: '/auth/google',
    github: '/auth/github',
  },
  home: '/',
  org: {
    root: '/[orgId]/dashboard',
    docs: '/[orgId]/docs',
    setup: '/[orgId]/setup',
    settings: {
      root: '/[orgId]/settings',
      general: '/[orgId]/settings/general',
      members: '/[orgId]/settings/members',
      billing: '/[orgId]/settings/billing',
    },
  },
  account: {
    root: '/account',
    profile: '/account/profile',
  },
  projects: {
    root: '/[orgId]/projects',
    new: '/[orgId]/projects/new',
    detail: '/[orgId]/projects/[projectId]',
    setup: '/[orgId]/projects/[projectId]/setup',
    dashboard: '/[orgId]/projects/[projectId]/dashboard',
    locations: '/[orgId]/projects/[projectId]/locations',
  },
}
