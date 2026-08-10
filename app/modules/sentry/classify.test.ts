import { classifyError, isExpectedUserError } from './classify';
import { AppError } from '@/utils/errors/app-error';
import { describe, expect, test } from 'bun:test';

const appError = (status: number) =>
  new AppError('boom', { status, captureToSentry: false });

const axiosErrorWithStatus = (status: number) => ({
  isAxiosError: true,
  message: 'Request failed',
  response: { status },
});

const axiosNetworkError = {
  isAxiosError: true,
  message: 'Network Error',
  code: 'ECONNABORTED',
};

const routeErrorResponse = (status: number) => ({
  status,
  statusText: '',
  internal: true,
  data: 'Error: No route matches',
});

describe('classifyError', () => {
  test('AppError with expected statuses → expected-user-state', () => {
    expect(classifyError(appError(401))).toBe('expected-user-state');
    expect(classifyError(appError(403))).toBe('expected-user-state');
    expect(classifyError(appError(404))).toBe('expected-user-state');
    expect(classifyError(appError(429))).toBe('expected-user-state');
  });

  test('AppError with unexpected statuses → unknown-failure', () => {
    expect(classifyError(appError(500))).toBe('unknown-failure');
    expect(classifyError(appError(422))).toBe('unknown-failure');
    expect(classifyError(appError(409))).toBe('unknown-failure');
  });

  test('plain object with numeric status (serialized AppError) → by status', () => {
    expect(classifyError({ status: 404 })).toBe('expected-user-state');
    expect(classifyError({ status: 429 })).toBe('expected-user-state');
    expect(classifyError({ status: 500 })).toBe('unknown-failure');
  });

  test('non-numeric status → unknown-failure', () => {
    expect(classifyError({ status: '404' })).toBe('unknown-failure');
  });

  test('AxiosError with response → by response status', () => {
    expect(classifyError(axiosErrorWithStatus(404))).toBe('expected-user-state');
    expect(classifyError(axiosErrorWithStatus(429))).toBe('expected-user-state');
    expect(classifyError(axiosErrorWithStatus(500))).toBe('unknown-failure');
  });

  test('AxiosError without response (network/timeout/DNS) → network-failure', () => {
    expect(classifyError(axiosNetworkError)).toBe('network-failure');
  });

  test('AppError(500) wrapping a no-response AxiosError cause → network-failure', () => {
    // Shape produced by both axios interceptors for no-response failures:
    // appErrorFromRaw / the server default branch fall back to status 500
    // and carry the original AxiosError only in `cause`.
    const wrapped = new AppError('Network Error', {
      status: 500,
      cause: axiosNetworkError,
      captureToSentry: false,
    });
    expect(classifyError(wrapped)).toBe('network-failure');
  });

  test('AppError wrapping an AxiosError WITH a response → by own status', () => {
    const wrapped404 = new AppError('not found', {
      status: 404,
      cause: axiosErrorWithStatus(404),
      captureToSentry: false,
    });
    const wrapped500 = new AppError('boom', {
      status: 500,
      cause: axiosErrorWithStatus(500),
      captureToSentry: false,
    });
    expect(classifyError(wrapped404)).toBe('expected-user-state');
    expect(classifyError(wrapped500)).toBe('unknown-failure');
  });

  test('RouteErrorResponse-shaped objects → by status', () => {
    expect(classifyError(routeErrorResponse(404))).toBe('expected-user-state');
    expect(classifyError(routeErrorResponse(500))).toBe('unknown-failure');
  });

  test('plain Error → unknown-failure', () => {
    expect(classifyError(new Error('boom'))).toBe('unknown-failure');
  });

  test('null / undefined / string → unknown-failure', () => {
    expect(classifyError(null)).toBe('unknown-failure');
    expect(classifyError(undefined)).toBe('unknown-failure');
    expect(classifyError('boom')).toBe('unknown-failure');
  });
});

describe('isExpectedUserError', () => {
  test('true only for expected-user-state', () => {
    expect(isExpectedUserError(appError(404))).toBe(true);
    expect(isExpectedUserError(axiosErrorWithStatus(429))).toBe(true);
    expect(isExpectedUserError(axiosNetworkError)).toBe(false);
    expect(isExpectedUserError(appError(500))).toBe(false);
    expect(isExpectedUserError(new Error('boom'))).toBe(false);
  });
});
