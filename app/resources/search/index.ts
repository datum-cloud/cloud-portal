// app/resources/search/index.ts
export type {
  SearchHit,
  SearchHitGroup,
  SearchHitTenant,
  SearchInput,
  SearchResult,
  SearchTarget,
} from './search.schema';

export {
  GROUP_RESULT_CAP,
  PROJECT_KINDS,
  RECENTS_CAPS,
  SEARCH_DEBOUNCE_MS,
} from './search.constants';

export { useSearchGlobal, useSearchInProject } from './search.queries';

export type { RecentsScope } from './search.recents';
export { clearRecents, pushRecentHit, pushRecentQuery, readRecents } from './search.recents';

export type {
  ScopeKey,
  SearchEventName,
  SearchEventPayloads,
  SearchSurface,
} from './search.telemetry';
export { emitSearchEvent } from './search.telemetry';
