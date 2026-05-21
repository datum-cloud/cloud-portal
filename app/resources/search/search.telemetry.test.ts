/// <reference types="bun-types/test" />
import { emitSearchEvent } from './search.telemetry';
import { describe, expect, it, mock, beforeEach } from 'bun:test';

// Mock @/modules/sentry before importing the module under test
const addBreadcrumb = mock(() => {});
mock.module('@/modules/sentry', () => ({
  addBreadcrumb,
}));

// Mock @/modules/logger
const loggerInfo = mock(() => {});
mock.module('@/modules/logger', () => ({
  logger: { info: loggerInfo },
}));

describe('emitSearchEvent', () => {
  beforeEach(() => {
    addBreadcrumb.mockClear();
    loggerInfo.mockClear();
  });

  it('emits a Sentry breadcrumb and a structured log line', () => {
    emitSearchEvent('search.opened', {
      surface: 'cmd-k',
      scope: 'global',
      hasRecents: false,
    });
    expect(addBreadcrumb).toHaveBeenCalledWith(
      'info',
      'search.opened',
      'search',
      expect.objectContaining({ surface: 'cmd-k', scope: 'global' })
    );
    expect(loggerInfo).toHaveBeenCalledWith(
      'search.opened',
      expect.objectContaining({ surface: 'cmd-k', scope: 'global' })
    );
  });

  it('never includes raw query text — only queryLength', () => {
    emitSearchEvent('search.queried', {
      surface: 'cmd-k',
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
      surface: 'cmd-k',
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
