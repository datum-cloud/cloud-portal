// .dependency-cruiser.cjs
//
// Layering rules for app/. Routes compose everything below them; features,
// modules and resources must not reach back up. Existing violations live in
// .dependency-cruiser-known-violations.json and are skipped by `bun run
// depcruise` (--ignore-known); anything new fails CI. Regenerate the baseline
// only when burning violations down:
//   bunx depcruise app --output-type baseline > .dependency-cruiser-known-violations.json
const TESTS = '(^|/)(__tests__|test)/|\\.(test|spec)\\.(ts|tsx)$';

module.exports = {
  forbidden: [
    {
      name: 'resources-not-to-routes',
      comment: 'Resources are data access; they must not depend on route modules.',
      severity: 'error',
      from: { path: '^app/resources/', pathNot: TESTS },
      to: { path: '^app/routes/' },
    },
    {
      name: 'resources-not-to-features',
      comment: 'Resources sit below features; features import resources, not the reverse.',
      severity: 'error',
      from: { path: '^app/resources/', pathNot: TESTS },
      to: { path: '^app/features/' },
    },
    {
      name: 'features-not-to-routes',
      comment: 'Features are composed by routes; they must not depend on route modules.',
      severity: 'error',
      from: { path: '^app/features/', pathNot: TESTS },
      to: { path: '^app/routes/' },
    },
    {
      name: 'modules-not-to-routes',
      comment: 'Modules are shared infrastructure and must not depend on route modules.',
      severity: 'error',
      from: { path: '^app/modules/', pathNot: TESTS },
      to: { path: '^app/routes/' },
    },
    {
      name: 'modules-not-to-features',
      comment: 'Modules are shared infrastructure and must not depend on product features.',
      severity: 'error',
      from: { path: '^app/modules/', pathNot: TESTS },
      to: { path: '^app/features/' },
    },
    {
      name: 'client-not-to-server',
      comment:
        'app/server is the Hono server. Only server code (app/server, any server/ directory, *.server.ts, entry.server) may import it.',
      severity: 'error',
      from: {
        path: '^app/',
        pathNot: `(^|/)server/|\\.server\\.(ts|tsx)$|^app/entry\\.server\\.tsx$|${TESTS}`,
      },
      to: { path: '^app/server/' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.json' },
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '^app/modules/gqlts/generated/|^app/modules/graphql/generated/' },
    tsPreCompilationDeps: true,
  },
};
