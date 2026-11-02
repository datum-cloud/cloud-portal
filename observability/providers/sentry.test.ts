import { SentryProvider, scrubSensitiveRequestData } from './sentry';
import { describe, expect, it } from 'vitest';

type Hook = (event: any, hint?: any) => any;

// The hooks are private factories; reach them the way Sentry.init would.
function hooks() {
  const provider = new SentryProvider() as any;
  return {
    beforeSend: provider.createBeforeSendHandler() as Hook,
    beforeSendTransaction: provider.createBeforeSendTransactionHandler() as Hook,
  };
}

function requestWithSecrets() {
  return {
    url: 'https://cloud.datum.net/org/acme',
    method: 'GET',
    cookies: { _session: 'access-and-refresh-tokens' },
    headers: {
      host: 'cloud.datum.net',
      'user-agent': 'test-agent',
      Cookie: '_session=access-and-refresh-tokens',
      authorization: 'Bearer access-token',
      'set-cookie': '_session=rotated-token',
    },
  };
}

function expectScrubbed(request: any) {
  expect(request.cookies).toBeUndefined();
  const headerNames = Object.keys(request.headers).map((name) => name.toLowerCase());
  expect(headerNames).not.toContain('cookie');
  expect(headerNames).not.toContain('authorization');
  expect(headerNames).not.toContain('set-cookie');
}

describe('Sentry server-side scrubbing', () => {
  it('strips cookies and auth headers from transaction events', () => {
    const event = {
      type: 'transaction',
      transaction: 'GET /org/:orgId',
      request: requestWithSecrets(),
      contexts: { response: { status_code: 200, headers: { 'Set-Cookie': '_session=new' } } },
    };

    const result = hooks().beforeSendTransaction(event);

    expectScrubbed(result.request);
    expect(result.contexts.response.headers).toEqual({});
    expect(result.contexts.response.status_code).toBe(200);
    expect(result.request.headers).toEqual({ host: 'cloud.datum.net', 'user-agent': 'test-agent' });
    expect(result.request.url).toBe('https://cloud.datum.net/org/acme');
  });

  it('strips cookies and auth headers from error events', () => {
    const event = {
      exception: { values: [{ type: 'Error', value: 'upstream exploded' }] },
      request: requestWithSecrets(),
    };

    const result = hooks().beforeSend(event, {});

    expectScrubbed(result.request);
    expect(result.request.headers).toEqual({ host: 'cloud.datum.net', 'user-agent': 'test-agent' });
  });

  it('passes events without request data through unchanged', () => {
    const event = { type: 'transaction', transaction: 'GET /_healthz' };

    expect(hooks().beforeSendTransaction(event)).toEqual(event);
  });

  it('does not modify the event it was given', () => {
    const event = { request: requestWithSecrets() };

    scrubSensitiveRequestData(event);

    expect(event.request.cookies).toEqual({ _session: 'access-and-refresh-tokens' });
    expect(event.request.headers.authorization).toBe('Bearer access-token');
  });
});
