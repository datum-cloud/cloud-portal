import type { Breakpoint } from '@/hooks/use-breakpoint';

export interface InitialSidebarOpenInput {
  /** Breakpoint the page renders for; on the server, the viewport client hint. */
  breakpoint: Breakpoint;
  /** The caller's explicit `defaultSidebarOpen` prop. */
  explicit?: boolean;
  /** The nav state the user last pinned, from the `sidebar_state` cookie. */
  persisted?: boolean;
  /** The `?sidebar=` search param. */
  sidebarParam?: string | null;
}

/**
 * Whether the main nav starts pinned open.
 *
 * Below desktop the layout always collapses the nav once it knows the
 * breakpoint, so that is decided first. Deciding it here, from the viewport
 * hint, lets the server render the collapsed rail a tablet will end up with
 * instead of rendering it expanded and shifting the page on hydration.
 *
 * On desktop: an explicit prop wins, then `?sidebar=false`, then the persisted
 * pin, then open.
 */
export function resolveInitialSidebarOpen({
  breakpoint,
  explicit,
  persisted,
  sidebarParam,
}: InitialSidebarOpenInput): boolean {
  if (breakpoint !== 'desktop') return false;
  if (explicit !== undefined) return explicit;
  if (sidebarParam === 'false') return false;
  return persisted ?? true;
}
