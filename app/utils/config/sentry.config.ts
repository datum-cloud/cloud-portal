export const sentryConfig = {
  // Gate sourcemap upload on "production build + auth token present" — NOT on
  // VERSION contents. The previous `VERSION?.includes('main')` gate never
  // matched production releases (tagged vX.Y.Z), so sourcemaps never uploaded
  // and stacks grouped on bundled line numbers that shift every release,
  // splitting one bug into a separate Sentry issue per release.
  isSourcemapEnabled: process.env.NODE_ENV === 'production' && !!process.env.SENTRY_AUTH_TOKEN,
  org: 'sentry',
  project: 'cloud-portal',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  release: process.env.VERSION || 'dev',
};
