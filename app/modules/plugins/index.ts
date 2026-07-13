/**
 * Public entrypoint for the plugins module.
 *
 * Re-exports the shared contract only. Server-only code (the registry, sources,
 * routes, dev-session) lives under `./server` and must be imported from there
 * so it never leaks into a client bundle.
 */
export * from './types';
export { validateManifest, manifestSchema, type ManifestValidationResult } from './manifest.schema';
export { satisfies, isSdkCompatible } from './sdk-range';
export { toPublicPlugin } from './sanitize';
