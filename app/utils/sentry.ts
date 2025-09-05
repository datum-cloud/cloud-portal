export const sentryConfig = {
  isSourcemapEnabled:
    process.env.NODE_ENV === 'production' || process.env.VERSION?.includes('main'),
  org: 'sentry',
  project: 'cloud-portal',
  authToken:
    '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',
  release: process.env.VERSION || 'dev',
};
