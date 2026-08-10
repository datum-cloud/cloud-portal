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
  test.each([[401], [403], [404], [429]])('AppError %d is expected-user-state', (status) => {
    expect(classifyError(appError(status))).toBe('expected-user-state');
    expect(isExpectedUserError(appError(status))).toBe(true);
  });

  test.each([[400], [409], [422], [500]])('AppError %d is unknown-failure', (status) => {
    expect(classifyError(appError(status))).toBe('unknown-failure');
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
  test.each([[401], [403], [404], [429]])('never retries expected %d', (status) => {
    expect(shouldRetryQuery(0, appError(status))).toBe(false);
  });

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

describe('hasUnresolvedProjectScope', () => {
  test('true only for project-scoped checks without a resolved projectId', () => {
    expect(hasUnresolvedProjectScope([{ scope: 'project' }], undefined)).toBe(true);
    expect(hasUnresolvedProjectScope([{ scope: 'project' }], 'proj-1')).toBe(false);
    expect(hasUnresolvedProjectScope([{ scope: 'org' }], undefined)).toBe(false);
    expect(hasUnresolvedProjectScope([], undefined)).toBe(false);
  });
});
