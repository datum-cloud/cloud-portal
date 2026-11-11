import { AppError, AuthorizationError } from './app-error';
import { PERMISSION_DENIED_MESSAGE } from './authorization-message';
import { mapApiError } from './error-mapper';
import { CombinedError } from '@urql/core';
import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, test } from 'vitest';

const RBAC_TEXT =
  'projects.resourcemanager.miloapis.com "acme" is forbidden: User "jane@example.com" cannot list resource "projects" in API group "resourcemanager.miloapis.com" at the cluster scope';

function axiosError(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, undefined, {
    status,
    statusText: '',
    data,
    headers: {},
    config,
  });
}

describe('mapApiError 403s', () => {
  test('an axios 403 shows the plain headline and keeps the raw text', () => {
    const error = mapApiError(axiosError(403, { message: RBAC_TEXT }));

    expect(error).toBeInstanceOf(AuthorizationError);
    expect(error.status).toBe(403);
    expect(error.message).toBe(PERMISSION_DENIED_MESSAGE);
    expect(error.originalMessage).toBe(RBAC_TEXT);
  });

  test('an axios 403 keeps its details so suspension checks still work', () => {
    const details = [{ path: [], message: 'suspended', code: 'ProjectSuspended' }];
    const error = mapApiError(axiosError(403, { message: RBAC_TEXT, details }));

    expect(error.details).toEqual(details);
  });

  test('a gateway FORBIDDEN response shows the plain headline and keeps the raw text', () => {
    const error = mapApiError({
      errors: [{ message: RBAC_TEXT, extensions: { code: 'FORBIDDEN' } }],
    });

    expect(error).toBeInstanceOf(AuthorizationError);
    expect(error.message).toBe(PERMISSION_DENIED_MESSAGE);
    expect(error.originalMessage).toBe(RBAC_TEXT);
  });

  test('a urql FORBIDDEN error shows the plain headline and keeps the raw text', () => {
    const error = mapApiError(
      new CombinedError({
        graphQLErrors: [{ message: RBAC_TEXT, extensions: { code: 'FORBIDDEN' } }],
      })
    );

    expect(error).toBeInstanceOf(AuthorizationError);
    expect(error.message).toBe(PERMISSION_DENIED_MESSAGE);
    expect(error.originalMessage).toBe(RBAC_TEXT);
  });

  test('a 403 written for people (quota, policy) keeps its own message', () => {
    const quota = "You've reached your quota for this resource type.";
    const error = mapApiError(axiosError(403, { message: quota }));

    expect(error.message).toBe(quota);
    expect(error.originalMessage).toBeUndefined();
  });
});

describe('mapApiError non-403s are unchanged', () => {
  test('401 keeps the upstream message', () => {
    const error = mapApiError(axiosError(401, { message: 'Session expired' }));

    expect(error.status).toBe(401);
    expect(error.message).toBe('Session expired');
    expect(error.originalMessage).toBeUndefined();
  });

  test('404 keeps the not-found message', () => {
    const error = mapApiError(axiosError(404, { message: RBAC_TEXT }));

    expect(error.status).toBe(404);
    expect(error.message).toBe('Resource not found');
  });

  test('500 keeps the upstream message', () => {
    const error = mapApiError(axiosError(500, { message: 'boom' }));

    expect(error.status).toBe(500);
    expect(error.message).toBe('boom');
    expect(error.originalMessage).toBeUndefined();
  });
});

describe('AppError with status 403', () => {
  test('the client K8s path gets the plain headline and keeps the raw text', () => {
    const parsed = 'User "jane@example.com" cannot get resource "dnszones"';
    const error = new AppError(parsed, {
      status: 403,
      originalMessage: RBAC_TEXT,
      captureToSentry: false,
    });

    expect(error.message).toBe(PERMISSION_DENIED_MESSAGE);
    expect(error.originalMessage).toBe(RBAC_TEXT);
  });

  test('a bare "Forbidden" body gets the plain headline', () => {
    const error = new AppError('Forbidden', { status: 403, captureToSentry: false });

    expect(error.message).toBe(PERMISSION_DENIED_MESSAGE);
    expect(error.originalMessage).toBe('Forbidden');
  });

  test('a 403 serializes the plain headline with the raw text beside it', () => {
    const json = new AuthorizationError(RBAC_TEXT).toJSON();

    expect(json.message).toBe(PERMISSION_DENIED_MESSAGE);
    expect(json.originalMessage).toBe(RBAC_TEXT);
  });

  test('an app-written 403 message is kept', () => {
    const error = new AuthorizationError('Cross-site request rejected');

    expect(error.message).toBe('Cross-site request rejected');
  });

  test('a non-403 AppError with RBAC-looking text is unchanged', () => {
    const error = new AppError(RBAC_TEXT, { status: 400, captureToSentry: false });

    expect(error.message).toBe(RBAC_TEXT);
  });
});
