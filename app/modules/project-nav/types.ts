/**
 * Stable host section ids for the project sidebar categories (#849).
 * Plugins may declare `section` on `portal.nav/project` to nest under these.
 */
export const PROJECT_NAV_SECTIONS = ['deliver', 'build', 'connect', 'observe', 'settings'] as const;

export type ProjectNavSection = (typeof PROJECT_NAV_SECTIONS)[number];

export function isProjectNavSection(value: unknown): value is ProjectNavSection {
  return typeof value === 'string' && (PROJECT_NAV_SECTIONS as readonly string[]).includes(value);
}

/** Coming soon chip for planned nav items (Cloudflare-style dashed pill). */
export const COMING_SOON_BADGE = {
  label: 'Coming Soon',
};
