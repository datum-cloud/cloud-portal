export const routes = {
  auth: {
    root: '/auth',
    signIn: '/auth/sign-in',
    signOut: '/auth/sign-out',
    callback: (provider: string) => `/auth/${provider}/callback`,
    google: '/auth/google',
    github: '/auth/github',
  },
  onboard: {
    root: '/onboard',
    project: '/onboard/project',
  },
  home: '/',
}
