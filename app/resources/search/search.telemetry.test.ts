/// <reference types="bun-types/test" />
import { emitSearchEvent } from './search.telemetry';
import { describe, expect, it, mock, beforeEach } from 'bun:test';

// Mock @/modules/sentry before importing the module under test
const addBreadcrumb = mock(() => {});
mock.module('@/modules/sentry', () => ({
  addBreadcrumb,
}));

// Mock @/modules/logger. `mock.module` is process-global in Bun and persists
// for the rest of the run, so keep the mocked logger faithful to the real
// surface (don't ship a partial `{ info }` that breaks other files' `error`
// calls when this mock leaks into them).
const loggerInfo = mock(() => {});
mock.module('@/modules/logger', () => ({
  logger: {
    debug: mock(() => {}),
    info: loggerInfo,
    warn: mock(() => {}),
    error: mock(() => {}),
    request: mock(() => {}),
    api: mock(() => {}),
    service: mock(() => {}),
  },
}));

describe('emitSearchEvent', () => {
  beforeEach(() => {
    addBreadcrumb.mockClear();
    loggerInfo.mockClear();
  });

  it('emits a Sentry breadcrumb and a structured log line', () => {
    emitSearchEvent('search.opened', {
      surface: 'project-bar',
      scope: 'global',
      hasRecents: false,
    });
    expect(addBreadcrumb).toHaveBeenCalledWith(
      'info',
      'search.opened',
      'search',
      expect.objectContaining({ surface: 'project-bar', scope: 'global' })
    );
    expect(loggerInfo).toHaveBeenCalledWith(
      'search.opened',
      expect.objectContaining({ surface: 'project-bar', scope: 'global' })
    );
  });

  it('never includes raw query text — only queryLength', () => {
    emitSearchEvent('search.queried', {
      surface: 'project-bar',
      scope: 'global',
      queryLength: 4,
      kindCount: 4,
      latencyMs: 80,
      hitCount: 7,
      hadOverflow: false,
    });
    const payload = (loggerInfo.mock.calls.at(-1) as unknown[])?.[1];
    expect(JSON.stringify(payload)).not.toMatch(/query[^L]/i); // no "query" except "queryLength"
  });

  it('scrubs payload on error events (no leak of internal Error)', () => {
    emitSearchEvent('search.error', {
      surface: 'project-bar',
      scope: 'global',
      statusCode: 500,
      queryLength: 3,
      kindCount: 4,
    });
    const payload = (loggerInfo.mock.calls.at(-1) as unknown[])?.[1];
    expect(payload).not.toHaveProperty('error');
    expect(payload).not.toHaveProperty('stack');
  });
});
