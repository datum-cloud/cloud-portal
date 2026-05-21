// app/resources/search/search.telemetry.ts
import { logger } from '@/modules/logger';
import { addBreadcrumb } from '@/modules/sentry';

export type SearchSurface = 'cmd-k' | 'project-bar' | 'mobile-sheet';
export type ScopeKey = 'global' | `project:${string}`;

export type SearchEventPayloads = {
  'search.opened': { surface: SearchSurface; scope: ScopeKey; hasRecents: boolean };
  'search.queried': {
    surface: SearchSurface;
    scope: ScopeKey;
    queryLength: number;
    kindCount: number;
    latencyMs: number;
    hitCount: number;
    hadOverflow: boolean;
  };
  'search.selected': {
    surface: SearchSurface;
    scope: ScopeKey;
    kind: string;
    groupPosition: number;
    globalPosition: number;
    queryLength: number;
    selectedFrom: 'results' | 'recents';
  };
  'search.dismissed': {
    surface: SearchSurface;
    scope: ScopeKey;
    queryLength: number;
    hitCountSeen: number;
    dwellMs: number;
  };
  'search.partial_permission': {
    surface: SearchSurface;
    scope: ScopeKey;
    deniedKinds: string[];
  };
  'search.error': {
    surface: SearchSurface;
    scope: ScopeKey;
    statusCode: number | 'network';
    queryLength: number;
    kindCount: number;
  };
};

export type SearchEventName = keyof SearchEventPayloads;

export function emitSearchEvent<N extends SearchEventName>(
  name: N,
  payload: SearchEventPayloads[N]
): void {
  const data = payload as Record<string, unknown>;
  // Breadcrumb first — attached even if logger throws
  addBreadcrumb('info', name, 'search', data);
  logger.info(name, data);
}
