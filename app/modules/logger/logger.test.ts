import { classifyError, isExpectedUserError } from '@/modules/sentry/classify';
import { parseApiVersion, parseResourceFromUrl } from '@/modules/sentry/context/resource';
import { AppError } from '@/utils/errors/app-error';
import { afterAll, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';

const captureError = mock(() => {});

// `mock.module` is process-global in Bun and persists for the rest of the
// run, so keep the mocked barrel faithful to the real surface where other
// files depend on it (classification + URL parsing stay real; capture
// functions become observable no-ops).
mock.module('@/modules/sentry', () => ({
  captureError,
  classifyError,
  isExpectedUserError,
  parseResourceFromUrl,
  parseApiVersion,
  addBreadcrumb: mock(() => {}),
  captureApiError: mock(() => {}),
  captureMessage: mock(() => {}),
  resolveErrorCode: () => undefined,
  setTag: mock(() => {}),
  setContext: mock(() => {}),
  isKubernetesResource: () => false,
  setSentryResourceContext: mock(() => {}),
  clearSentryResourceContext: mock(() => {}),
  setResourceContextFromUrl: mock(() => {}),
  trackApiCall: mock(() => {}),
  trackApiError: mock(() => {}),
  trackFormSubmit: mock(() => {}),
  trackFormSuccess: mock(() => {}),
  trackFormValidationError: mock(() => {}),
  trackFormError: mock(() => {}),
}));

const { Logger } = await import('./logger');

const logSpy = spyOn(console, 'log').mockImplementation(() => {});

const rawAxiosError = (status: number): Error =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status },
  });

beforeEach(() => {
  captureError.mockClear();
});

afterAll(() => {
  logSpy.mockRestore();
});

describe('Logger.error Sentry capture policy', () => {
  const logger = new Logger();

  test('expected user-state AppError (404) → logged but NOT captured', () => {
    logger.error('load failed', new AppError('not found', { status: 404, captureToSentry: false }));
    expect(captureError).not.toHaveBeenCalled();
  });

  test('expected user-state raw AxiosError (401/403/404/429) → NOT captured', () => {
    logger.error('upstream call failed', rawAxiosError(401));
    logger.error('upstream call failed', rawAxiosError(403));
    logger.error('upstream call failed', rawAxiosError(404));
    logger.error('upstream call failed', rawAxiosError(429));
    expect(captureError).not.toHaveBeenCalled();
  });

  test('unexpected failures are still captured', () => {
    logger.error('boom', new Error('boom'));
    logger.error('upstream 500', rawAxiosError(500));
    expect(captureError).toHaveBeenCalledTimes(2);
  });

  test('error without an Error argument captures a synthetic Error', () => {
    logger.error('something failed', { detail: 'context' });
    expect(captureError).toHaveBeenCalledTimes(1);
  });

  test('apiError with an expected upstream status is not captured', () => {
    logger.apiError({ method: 'GET', url: '/apis/x', status: 404, error: rawAxiosError(404) });
    expect(captureError).not.toHaveBeenCalled();
  });

  test('apiError with a 5xx upstream status is captured', () => {
    logger.apiError({ method: 'GET', url: '/apis/x', status: 500, error: rawAxiosError(500) });
    expect(captureError).toHaveBeenCalledTimes(1);
  });
});
