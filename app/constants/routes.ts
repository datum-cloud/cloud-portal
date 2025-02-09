export const routes = {
  auth: {
    root: '/auth',
    signIn: '/auth/sign-in',
    signOut: '/auth/sign-out',
    callback: (provider: string) => `/auth/${provider}/callback`,
    google: '/auth/google',
    github: '/auth/github',
  },
  org: {
    root: '/dashboard',
    askAi: '/ask-ai',
    docs: '/docs',
    settings: {
      root: '/settings',
      general: '/settings/general',
      members: '/settings/members',
      billing: '/settings/billing',
    },
    account: {
      root: '/account',
      profile: '/account/profile',
    },
  },
  projects: {
    root: '/projects',
    new: '/projects/new',
    detail: (id: string) => `/projects/${id}`,
    locations: (id: string) => `/projects/${id}/locations`,
  },
  onboarding: {
    root: '/onboarding',
    project: '/onboarding/project',
  },
  home: '/',
}
