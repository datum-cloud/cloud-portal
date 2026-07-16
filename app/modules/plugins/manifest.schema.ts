/**
 * Zod validation for `plugin-manifest.json`.
 *
 * Contract rules enforced here (see `docs/enhancements/portal-plugin-system.md`):
 * - Known extension types (`portal.nav/project`, `portal.page/project`,
 *   `portal.card/project-home`) are strictly validated.
 * - Unknown extension types are *tolerated*, not fatal: they parse through a
 *   permissive shape and are reported so the caller can record a status note.
 * - Every `$codeRef` on a known extension must reference a declared
 *   `exposedModule`.
 */
import {
  EXTENSION_CARD_PROJECT_HOME,
  EXTENSION_NAV_PROJECT,
  EXTENSION_PAGE_PROJECT,
  KNOWN_EXTENSION_TYPES,
  type PluginManifest,
} from './types';
import { z } from 'zod';

const permissionSchema = z.object({
  group: z.string(),
  resource: z.string(),
  verb: z.string(),
});

const requirementsSchema = z
  .object({
    permissions: z.array(permissionSchema).optional(),
  })
  .optional();

const codeRefSchema = z.object({
  $codeRef: z.string().min(1),
});

const navProjectExtensionSchema = z.object({
  type: z.literal(EXTENSION_NAV_PROJECT),
  properties: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    icon: z.string().min(1),
    path: z.string(),
    order: z.number().optional(),
  }),
  requirements: requirementsSchema,
});

const pageProjectExtensionSchema = z.object({
  type: z.literal(EXTENSION_PAGE_PROJECT),
  properties: z.object({
    path: z.string(),
    component: codeRefSchema,
  }),
  requirements: requirementsSchema,
});

const cardProjectHomeExtensionSchema = z.object({
  type: z.literal(EXTENSION_CARD_PROJECT_HOME),
  properties: z.object({
    title: z.string().min(1),
    component: codeRefSchema,
    order: z.number().optional(),
  }),
  requirements: requirementsSchema,
});

/**
 * Catch-all for extension types the host doesn't recognize. It refuses *known*
 * types so a malformed known extension fails its own strict schema instead of
 * silently degrading into this permissive one.
 */
const unknownExtensionSchema = z.object({
  type: z
    .string()
    .min(1)
    .refine((t) => !(KNOWN_EXTENSION_TYPES as readonly string[]).includes(t), {
      message: 'handled by a specific extension schema',
    }),
  properties: z.record(z.string(), z.unknown()).optional(),
  requirements: requirementsSchema,
});

const extensionSchema = z.union([
  navProjectExtensionSchema,
  pageProjectExtensionSchema,
  cardProjectHomeExtensionSchema,
  unknownExtensionSchema,
]);

export const manifestSchema = z
  .object({
    name: z.string().min(1),
    version: z.string().min(1),
    sdk: z.object({
      name: z.string().min(1),
      range: z.string().min(1),
    }),
    remoteEntry: z.string().min(1),
    exposedModules: z.record(z.string(), z.string()),
    extensions: z.array(extensionSchema),
  })
  .superRefine((manifest, ctx) => {
    const modules = new Set(Object.keys(manifest.exposedModules));

    manifest.extensions.forEach((ext, index) => {
      // Only enforce $codeRef resolution for known extension types the host
      // actually renders; unknown extensions are recorded, never rendered.
      if (!(KNOWN_EXTENSION_TYPES as readonly string[]).includes(ext.type)) return;

      const component = (ext.properties as { component?: { $codeRef?: string } } | undefined)
        ?.component;
      const ref = component?.$codeRef;
      if (!ref) return;

      // `$codeRef` may be "Module" or "Module.exportName"; only the module part
      // must resolve against exposedModules.
      const moduleName = ref.split('.')[0];
      if (!modules.has(moduleName)) {
        ctx.addIssue({
          code: 'custom',
          path: ['extensions', index, 'properties', 'component', '$codeRef'],
          message: `$codeRef "${ref}" references unknown exposedModule "${moduleName}"`,
        });
      }
    });
  });

/** Result of validating a manifest: a discriminated success/failure union. */
export type ManifestValidationResult =
  | { valid: true; manifest: PluginManifest; unknownExtensionTypes: string[] }
  | { valid: false; errors: string[] };

/**
 * Validates arbitrary parsed JSON against the manifest contract.
 *
 * On success, also reports the distinct unknown extension types encountered so
 * the registry can surface them as a non-fatal status note.
 */
export function validateManifest(raw: unknown): ManifestValidationResult {
  const result = manifestSchema.safeParse(raw);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    });
    return { valid: false, errors };
  }

  const manifest = result.data as PluginManifest;
  const unknownExtensionTypes = [
    ...new Set(
      manifest.extensions
        .map((ext) => ext.type)
        .filter((type) => !(KNOWN_EXTENSION_TYPES as readonly string[]).includes(type))
    ),
  ];

  return { valid: true, manifest, unknownExtensionTypes };
}
