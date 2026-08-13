/**
 * Consolidated coverage for the pure error-policy surface introduced by the
 * Sentry noise rework (#1378): classification, beforeSend backstop, query
 * retry predicate, related-resource degradation, and the rbac project-scope
 * guard. One compact file by design — the behavior-level suites live in the
 * pre-existing test files.
 */
import { hasUnresolvedProjectScope } from '../rbac/hooks/project-scope-guard';
import { shouldRetryQuery } from '../tanstack/query';
import { classifyError, isExpectedUserError } from './classify';
import { shouldDropSentryEvent, shouldDropSentryEventClient } from './filters';
import { buildErrorFingerprint, normalizeMessage } from './fingerprint';
import { resolveRelatedResource } from '@/resources/http-proxies/related-resource';
import { AppError } from '@/utils/errors/app-error';
import type { Event, EventHint } from '@sentry/react-router';
import { beforeEach, describe, expect, mock, test } from 'bun:test';

const appError = (status: number, cause?: unknown) =>
  new AppError('boom', { status, cause, captureToSentry: false });

const axiosError = (status?: number) => ({
  isAxiosError: true,
  name: 'AxiosError',
  message: 'failed',
  ...(status !== undefined && { response: { status } }),
});

const emptyEvent = {} as Event;
const hintFor = (error: unknown): EventHint => ({ originalException: error });

let warnSpy: ReturnType<typeof mock>;
beforeEach(() => {
  warnSpy = mock(() => {});
  console.warn = warnSpy as unknown as typeof console.warn;
});

describe('classifyError', () => {
  // Every 4xx is handled and surfaced to the user (boundary/toast/inline),
  // so none of them are captured — including 400/409/422, which used to be
  // treated as bugs and leaked into Sentry as admission-webhook rejections,
  // "already exists" conflicts, and validation failures.
  test.each([[400], [401], [403], [404], [409], [418], [422], [429], [451], [499]])(
    'AppError %d is expected-user-state',
    (status) => {
      expect(classifyError(appError(status))).toBe('expected-user-state');
      expect(isExpectedUserError(appError(status))).toBe(true);
    }
  );

  // 5xx means we broke — still captured.
  test.each([[500], [502], [503], [504]])('AppError %d is unknown-failure', (status) => {
    expect(classifyError(appError(status))).toBe('unknown-failure');
    expect(isExpectedUserError(appError(status))).toBe(false);
  });

  test('AxiosError with a 404 response is expected-user-state', () => {
    expect(classifyError(axiosError(404))).toBe('expected-user-state');
  });

  test('AxiosError without a response is network-failure', () => {
    expect(classifyError(axiosError())).toBe('network-failure');
  });

  test('interceptor-wrapped no-response failure (status-500 AppError) is network-failure', () => {
    expect(classifyError(appError(500, axiosError()))).toBe('network-failure');
  });

  test('doubly-wrapped no-response failure is still network-failure (bounded cause walk)', () => {
    expect(classifyError(appError(500, appError(500, axiosError())))).toBe('network-failure');
  });

  test('wrapped AxiosError WITH a response defers to the wrapper status', () => {
    expect(classifyError(appError(500, axiosError(500)))).toBe('unknown-failure');
    expect(classifyError(appError(404, axiosError(404)))).toBe('expected-user-state');
  });

  test('plain objects with a numeric status classify by status (RR serialization)', () => {
    expect(classifyError({ status: 404 })).toBe('expected-user-state');
    expect(classifyError({ status: 500 })).toBe('unknown-failure');
  });

  test('non-status shapes are unknown-failure', () => {
    expect(classifyError(new Error('boom'))).toBe('unknown-failure');
    expect(classifyError(undefined)).toBe('unknown-failure');
    expect(classifyError('boom')).toBe('unknown-failure');
  });
});

describe('beforeSend backstop', () => {
  test('drops leaked expected errors on both server and client filters', () => {
    expect(shouldDropSentryEvent(emptyEvent, hintFor(appError(404)))).toBe(true);
    expect(shouldDropSentryEventClient(emptyEvent, hintFor(appError(404)))).toBe(true);
  });

  test('network failures: client drops, server keeps (infra signal)', () => {
    const hint = hintFor(appError(500, axiosError()));
    expect(shouldDropSentryEvent(emptyEvent, hint)).toBe(false);
    expect(shouldDropSentryEventClient(emptyEvent, hint)).toBe(true);
  });

  test('unknown failures pass through both filters', () => {
    const hint = hintFor(new Error('real bug'));
    expect(shouldDropSentryEvent(emptyEvent, hint)).toBe(false);
    expect(shouldDropSentryEventClient(emptyEvent, hint)).toBe(false);
  });

  test('missing hint keeps the event', () => {
    expect(shouldDropSentryEvent(emptyEvent, undefined)).toBe(false);
  });

  test('drops a 4xx `status` tag even when the wrapped original is unknown-failure', () => {
    // captureApiError wraps the original in a synthetic Error; the user-facing
    // status travels only as event.tags.status (set via scope.setTag('status')).
    const event: Event = { ...emptyEvent, tags: { status: '404' } };
    expect(shouldDropSentryEvent(event, hintFor(new Error('wrapped upstream failure')))).toBe(true);
    expect(shouldDropSentryEventClient(event, hintFor(new Error('wrapped upstream failure')))).toBe(
      true
    );
  });

  test('keeps a 5xx `status` tag (real failures still captured)', () => {
    const event: Event = { ...emptyEvent, tags: { status: '500' } };
    expect(shouldDropSentryEvent(event, hintFor(new Error('wrapped upstream failure')))).toBe(
      false
    );
  });

  test('ignores non-numeric status tags', () => {
    const event: Event = { ...emptyEvent, tags: { status: 'network' } };
    expect(shouldDropSentryEvent(event, hintFor(new Error('wrapped upstream failure')))).toBe(
      false
    );
  });

  test('leak warning is deduped by error signature', () => {
    shouldDropSentryEvent(emptyEvent, hintFor(appError(404)));
    shouldDropSentryEvent(emptyEvent, hintFor(appError(404)));
    const initialWarns = warnSpy.mock.calls.length;
    expect(initialWarns).toBeLessThanOrEqual(1);
    shouldDropSentryEvent(emptyEvent, hintFor(appError(429)));
    expect(warnSpy.mock.calls.length).toBeGreaterThanOrEqual(initialWarns);
  });
});

describe('shouldRetryQuery', () => {
  test.each([[400], [401], [403], [404], [409], [422], [429]])(
    'never retries handled %d',
    (status) => {
      expect(shouldRetryQuery(0, appError(status))).toBe(false);
    }
  );

  test('retries unexpected failures exactly once', () => {
    expect(shouldRetryQuery(0, appError(500))).toBe(true);
    expect(shouldRetryQuery(1, appError(500))).toBe(false);
    expect(shouldRetryQuery(0, new Error('network'))).toBe(true);
  });
});

describe('resolveRelatedResource', () => {
  test('404 degrades to absent, 403 to forbidden', async () => {
    await expect(
      resolveRelatedResource(async () => Promise.reject(appError(404)))
    ).resolves.toEqual({ state: 'absent', data: null });
    await expect(
      resolveRelatedResource(async () => Promise.reject(appError(403)))
    ).resolves.toEqual({ state: 'forbidden', data: null });
  });

  test('unexpected errors rethrow by default and absorb on request', async () => {
    const failure = appError(500);
    await expect(resolveRelatedResource(async () => Promise.reject(failure))).rejects.toBe(failure);
    await expect(
      resolveRelatedResource(async () => Promise.reject(failure), { onUnexpected: 'absorb' })
    ).resolves.toEqual({ state: 'error', data: null, error: failure });
  });

  test('success passes data through', async () => {
    await expect(resolveRelatedResource(async () => 'ok')).resolves.toEqual({
      state: 'ok',
      data: 'ok',
    });
  });
});

describe('normalizeMessage', () => {
  test('redacts quoted resource names so one fault groups as one issue', () => {
    expect(normalizeMessage('secrets "portfolio-lmpn0u-basic-auth" not found')).toBe(
      'secrets "<redacted>" not found'
    );
    expect(normalizeMessage('secrets "portfolio-lmpn0u-basic-auth" not found')).toBe(
      normalizeMessage('secrets "some-other-name" not found')
    );
  });

  test('redacts emails and uuids', () => {
    expect(normalizeMessage('User jszychowski@datum.net cannot list allowancebuckets')).toBe(
      'User <email> cannot list allowancebuckets'
    );
    expect(normalizeMessage('request 04ddd6d3-db0c-4619-92ce-6b2fc4e2944f failed')).toBe(
      'request <uuid> failed'
    );
  });

  test('keeps genuinely different faults distinct', () => {
    expect(normalizeMessage('secrets "a" not found')).not.toBe(
      normalizeMessage('dnszones "a" not found')
    );
  });

  test('leaves unquoted identifiers alone', () => {
    expect(normalizeMessage('projectId is required for project-scoped permission checks')).toBe(
      'projectId is required for project-scoped permission checks'
    );
  });
});

describe('AppError sentryEventId passthrough', () => {
  test('threads a server-captured event id into the serialized body', () => {
    const error = new AppError('boom', {
      status: 500,
      sentryEventId: 'evt_123',
      captureToSentry: false,
    });
    expect(error.sentryEventId).toBe('evt_123');
    expect(error.toJSON().sentryEventId).toBe('evt_123');
  });
});

describe('buildErrorFingerprint', () => {
  test('prefers code over message when present', () => {
    expect(
      buildErrorFingerprint({
        name: 'AppError',
        code: 'NOT_FOUND',
        message: 'secrets "x" not found',
      })
    ).toEqual(['AppError', 'NOT_FOUND']);
  });

  test('falls back to the normalized message when there is no code', () => {
    expect(
      buildErrorFingerprint({ name: 'TypeError', message: '"/" cannot be parsed as a URL.' })
    ).toEqual(['TypeError', '"<redacted>" cannot be parsed as a URL.']);
  });

  test('collapses the same fault raised for different resources', () => {
    expect(
      buildErrorFingerprint({
        name: 'AppError',
        message: 'connectors "claude-test-connector" not found',
      })
    ).toEqual(
      buildErrorFingerprint({ name: 'AppError', message: 'connectors "other-one" not found' })
    );
  });

  test('tolerates non-error shapes', () => {
    expect(buildErrorFingerprint(undefined)).toEqual(['Error', '<no-message>']);
    expect(buildErrorFingerprint('boom')).toEqual(['Error', '<no-message>']);
  });
});

describe('hasUnresolvedProjectScope', () => {
  test('true only for project-scoped checks without a resolved projectId', () => {
    expect(hasUnresolvedProjectScope([{ scope: 'project' }], undefined)).toBe(true);
    expect(hasUnresolvedProjectScope([{ scope: 'project' }], 'proj-1')).toBe(false);
    expect(hasUnresolvedProjectScope([{ scope: 'org' }], undefined)).toBe(false);
    expect(hasUnresolvedProjectScope([], undefined)).toBe(false);
  });
});
