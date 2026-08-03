import { classifyQuotaError, isQuotaError, parseQuotaError } from './quota-error';
import { AppError } from '@/utils/errors/app-error';
import { describe, expect, test } from 'bun:test';

const forbidden = (originalMessage: string, k8sDetails?: { kind?: string; group?: string }) =>
  new AppError('parsed message', {
    status: 403,
    code: 'AUTHORIZATION_ERROR',
    originalMessage,
    k8sDetails,
    captureToSentry: false,
  });

const ISSUE_MSG =
  'dnszones.dns.networking.miloapis.com "edge-datum-net-tu60bt" is forbidden: Insufficient quota resources available. Review your quota usage and reach out to support if you need additional resources.';
const PLUGIN_MSG =
  'dnszones.dns.networking.miloapis.com "my-zone" is forbidden: You\'ve reached your quota for this resource type (Insufficient quota resources. Contact your account administrator to review quota limits and usage.). Delete unused resources to free up capacity, or contact support to request a higher limit.';

describe('classifyQuotaError', () => {
  test('claim-controller and admission-plugin denials → denied', () => {
    expect(classifyQuotaError(forbidden(ISSUE_MSG))).toBe('denied');
    expect(classifyQuotaError(forbidden(PLUGIN_MSG))).toBe('denied');
  });
  test('timeout / conflict / internal → retryable', () => {
    expect(
      classifyQuotaError(
        forbidden(
          'x "y" is forbidden: Your request took too long to be checked against your quota. Please try again in a moment — if this keeps happening, contact support.'
        )
      )
    ).toBe('retryable');
    expect(
      classifyQuotaError(
        forbidden(
          'x "y" is forbidden: We\'re still cleaning up from a previous attempt to create this resource. Please try again in a few seconds.'
        )
      )
    ).toBe('retryable');
    expect(
      classifyQuotaError(
        forbidden(
          'x "y" is forbidden: Something went wrong while checking your quota for this request. Please try again — if this keeps happening, contact support.'
        )
      )
    ).toBe('retryable');
  });
  test('misconfigured template → misconfigured', () => {
    expect(
      classifyQuotaError(
        forbidden(
          'x "y" is forbidden: Quota enforcement for this resource type is misconfigured and can\'t be applied. This needs a fix from the service provider — please contact support.'
        )
      )
    ).toBe('misconfigured');
  });
  test('RBAC 403 and non-403 → null', () => {
    expect(
      classifyQuotaError(
        forbidden(
          'dnszones.dns.networking.miloapis.com "z" is forbidden: User "u" cannot create resource "dnszones" in API group "dns.networking.miloapis.com"'
        )
      )
    ).toBeNull();
    expect(
      classifyQuotaError(new AppError('Insufficient quota resources', { status: 500 }))
    ).toBeNull();
    expect(classifyQuotaError(new Error('Insufficient quota resources'))).toBeNull();
  });
  test('falls back to message when originalMessage is absent', () => {
    expect(
      classifyQuotaError(
        new AppError('Insufficient quota resources available.', {
          status: 403,
          captureToSentry: false,
        })
      )
    ).toBe('denied');
  });
});

describe('parseQuotaError', () => {
  test('prefers k8sDetails (kind holds the plural)', () => {
    expect(
      parseQuotaError(
        forbidden(ISSUE_MSG, { kind: 'dnszones', group: 'dns.networking.miloapis.com' })
      )
    ).toEqual({
      group: 'dns.networking.miloapis.com',
      resource: 'dnszones',
      resourceType: 'dns.networking.miloapis.com/dnszones',
    });
  });
  test('falls back to the forbidden-prefix regex', () => {
    expect(parseQuotaError(forbidden(ISSUE_MSG)).resourceType).toBe(
      'dns.networking.miloapis.com/dnszones'
    );
  });
  test('non-AppError → empty object', () => {
    expect(parseQuotaError(new Error('nope'))).toEqual({});
  });
});

describe('isQuotaError', () => {
  test('true for any quota kind, false otherwise', () => {
    expect(isQuotaError(forbidden(ISSUE_MSG))).toBe(true);
    expect(isQuotaError(new Error('x'))).toBe(false);
  });
});
