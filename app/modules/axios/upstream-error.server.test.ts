import { unwrapUpstreamError } from './upstream-error-bridge';
import { resolveErrorCode } from '@/modules/sentry/capture';
import { classifyError, isExpectedUserError } from '@/modules/sentry/classify';
import { parseApiVersion, parseResourceFromUrl } from '@/modules/sentry/context/resource';
import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from '@/utils/errors';
import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, mock, test } from 'bun:test';

const captureApiError = mock(() => {});

// `mock.module` is process-global in Bun and persists for the rest of the
// run, so keep the mocked barrel faithful to the real surface where other
// files depend on it (parseResourceFromUrl is load-bearing for the metrics
// module; the capture/context functions become harmless no-ops).
mock.module('@/modules/sentry', () => ({
  captureApiError,
  classifyError,
  isExpectedUserError,
  resolveErrorCode,
  parseResourceFromUrl,
  parseApiVersion,
  addBreadcrumb: mock(() => {}),
  captureError: mock(() => {}),
  captureMessage: mock(() => {}),
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

const { attachUpstreamErrorHandling, createUpstreamErrorHandler } =
  await import('./upstream-error.server');
const { upstreamResponsesTotal } = await import('@/server/observability/upstream-metrics');

/** Sum of the real prom-client counter across all label sets with `status`. */
async function statusTotal(status: string): Promise<number> {
  const metric = await upstreamResponsesTotal.get();
  return metric.values
    .filter((value) => value.labels.status === status)
    .reduce((sum, value) => sum + value.value, 0);
}

const K8S_URL = '/apis/networking.datumapis.com/v1alpha/namespaces/ns1/httpproxies/proxy1';

const makeConfig = (method: string, url: string): InternalAxiosRequestConfig =>
  ({ method, url, headers: {} }) as unknown as InternalAxiosRequestConfig;

function httpError(status: number, data?: unknown, url = K8S_URL, method = 'get'): AxiosError {
  const config = makeConfig(method, url);
  const response = { status, statusText: '', headers: {}, config, data } as AxiosResponse;
  return new AxiosError(
    `Request failed with status code ${status}`,
    'ERR_BAD_REQUEST',
    config,
    {},
    response
  );
}

const k8sStatus = (code: number, reason: string, message: string) => ({
  kind: 'Status',
  apiVersion: 'v1',
  status: 'Failure',
  message,
  reason,
  code,
  details: { name: 'proxy1', group: 'networking.datumapis.com', kind: 'httpproxies' },
});

describe('createUpstreamErrorHandler', () => {
  const handler = createUpstreamErrorHandler();

  beforeEach(() => {
    captureApiError.mockClear();
  });

  test('401 → AuthenticationError, no Sentry capture', async () => {
    const thrown = await handler(httpError(401, { message: 'nope' })).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(AuthenticationError);
    expect((thrown as AppError).status).toBe(401);
    expect(captureApiError).not.toHaveBeenCalled();
  });

  test('401 with invalid-token body → "Session expired"', async () => {
    const thrown = await handler(
      httpError(401, { error: 'access_denied', error_description: 'access token invalid' })
    ).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(AuthenticationError);
    expect((thrown as Error).message).toBe('Session expired');
    expect(captureApiError).not.toHaveBeenCalled();
  });

  test('403 with K8s Status → AuthorizationError keeping K8s fields, no capture', async () => {
    const thrown = await handler(
      httpError(403, k8sStatus(403, 'Forbidden', 'httpproxies "proxy1" is forbidden'))
    ).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(AuthorizationError);
    expect(thrown).toMatchObject({
      status: 403,
      code: 'AUTHORIZATION_ERROR',
      k8sReason: 'Forbidden',
    });
    expect(captureApiError).not.toHaveBeenCalled();
  });

  test('404 with K8s Status → AppError with parsed code, no capture', async () => {
    const thrown = await handler(
      httpError(404, k8sStatus(404, 'NotFound', 'httpproxies "proxy1" not found'))
    ).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(AppError);
    expect(thrown).not.toBeInstanceOf(NotFoundError);
    expect(thrown).toMatchObject({ status: 404, code: 'NOT_FOUND', k8sReason: 'NotFound' });
    expect(captureApiError).not.toHaveBeenCalled();
  });

  test('404 without K8s Status → NotFoundError, no capture', async () => {
    const thrown = await handler(httpError(404)).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(NotFoundError);
    expect(captureApiError).not.toHaveBeenCalled();
  });

  test('429 → AppError(429), no capture', async () => {
    const thrown = await handler(httpError(429, { message: 'Too many requests' })).catch(
      (e: unknown) => e
    );
    expect(thrown).toBeInstanceOf(AppError);
    expect((thrown as AppError).status).toBe(429);
    expect(captureApiError).not.toHaveBeenCalled();
  });

  test('422 → ValidationError, captured (unexpected status)', async () => {
    const thrown = await handler(httpError(422, { message: 'invalid spec' })).catch(
      (e: unknown) => e
    );
    expect(thrown).toBeInstanceOf(ValidationError);
    expect(captureApiError).toHaveBeenCalledTimes(1);
  });

  test('500 → AppError(500) and captureApiError called with request info', async () => {
    const thrown = await handler(httpError(500, { message: 'boom' })).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(AppError);
    expect((thrown as AppError).status).toBe(500);
    expect(captureApiError).toHaveBeenCalledTimes(1);
    expect(captureApiError).toHaveBeenCalledWith(
      expect.objectContaining({ status: 500, method: 'get', url: K8S_URL })
    );
    // captureApiError owns the Sentry event — the thrown AppError must not
    // auto-capture a duplicate.
    expect((thrown as AppError).sentryEventId).toBeUndefined();
  });

  test('no-response network error still throws AppError (captured infra signal)', async () => {
    const netError = new AxiosError(
      'timeout of 60000ms exceeded',
      'ECONNABORTED',
      makeConfig('get', K8S_URL),
      {}
    );
    const thrown = await handler(netError).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(AppError);
    expect((thrown as AppError).status).toBe(500);
    expect(captureApiError).toHaveBeenCalledTimes(1);
    expect((thrown as AppError).sentryEventId).toBeUndefined();
  });

  test('no-response network error records status="network", not a fabricated "500"', async () => {
    const before500 = await statusTotal('500');
    const beforeNetwork = await statusTotal('network');

    const netError = new AxiosError(
      'timeout of 60000ms exceeded',
      'ECONNABORTED',
      makeConfig('get', K8S_URL),
      {}
    );
    await handler(netError).catch(() => undefined);

    expect(await statusTotal('network')).toBe(beforeNetwork + 1);
    expect(await statusTotal('500')).toBe(before500);
  });

  test('non-Axios rejection passes through unchanged', async () => {
    const alreadyTyped = new Error('already transformed by an earlier interceptor');
    const thrown = await handler(alreadyTyped).catch((e: unknown) => e);
    expect(thrown).toBe(alreadyTyped);
    expect(captureApiError).not.toHaveBeenCalled();
  });

  test('thrown errors carry the original AxiosError as cause', async () => {
    const original = httpError(404);
    const thrown = await handler(original).catch((e: unknown) => e);
    expect(unwrapUpstreamError(thrown)).toBe(original);
  });
});

describe('attachUpstreamErrorHandling', () => {
  const adapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    if (config.url?.includes('missing')) {
      const response = {
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config,
        data: k8sStatus(404, 'NotFound', 'httpproxies "missing" not found'),
      } as AxiosResponse;
      throw new AxiosError(
        'Request failed with status code 404',
        'ERR_BAD_REQUEST',
        config,
        {},
        response
      );
    }
    return {
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
      data: { ok: true },
    } as AxiosResponse;
  };

  test('raw AxiosError from the instance surfaces as typed AppError', async () => {
    const instance = axios.create({ adapter });
    attachUpstreamErrorHandling(instance);

    const thrown = await instance
      .get('/apis/networking.datumapis.com/v1alpha/namespaces/ns1/httpproxies/missing')
      .catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(AppError);
    expect((thrown as AppError).status).toBe(404);
  });

  test('successful responses pass through unchanged', async () => {
    const instance = axios.create({ adapter });
    attachUpstreamErrorHandling(instance);

    const response = await instance.get(
      '/apis/networking.datumapis.com/v1alpha/namespaces/ns1/httpproxies'
    );
    expect(response.data).toEqual({ ok: true });
  });
});
