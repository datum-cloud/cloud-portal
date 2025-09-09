export const sentryConfig = {
  isSourcemapEnabled:
    process.env.NODE_ENV === 'production' && process.env.VERSION?.includes('main'),
  org: 'sentry',
  project: 'cloud-portal',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  release: process.env.VERSION || 'dev',
};
