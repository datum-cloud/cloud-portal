import { isHttpProxyProvisioning } from './http-proxy.provisioning';
import type { HttpProxy } from './http-proxy.schema';
import { describe, expect, test } from 'bun:test';

function proxy(overrides: Partial<HttpProxy>): HttpProxy {
  return {
    uid: 'uid',
    name: 'alb',
    resourceVersion: '1',
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('isHttpProxyProvisioning', () => {
  test('is false when the proxy is ready with no custom hostnames', () => {
    expect(
      isHttpProxyProvisioning(
        proxy({
          status: { conditions: [{ type: 'Ready', status: 'True', reason: 'Ready', message: '' }] },
        })
      )
    ).toBe(false);
  });

  test('is true while the proxy itself is still programming', () => {
    expect(
      isHttpProxyProvisioning(
        proxy({
          status: {
            conditions: [{ type: 'Ready', status: 'False', reason: 'Pending', message: 'wait' }],
          },
        })
      )
    ).toBe(true);
  });

  test('is false once the operator rejects the proxy as invalid', () => {
    expect(
      isHttpProxyProvisioning(
        proxy({
          status: {
            conditions: [
              {
                type: 'Accepted',
                status: 'False',
                reason: 'DerivedResourceInvalid',
                message: 'rejected',
              },
              { type: 'Programmed', status: 'False', reason: 'Pending', message: 'wait' },
            ],
          },
        })
      )
    ).toBe(false);
  });

  test('is true while a hostname certificate is still issuing', () => {
    expect(
      isHttpProxyProvisioning(
        proxy({
          hostnames: ['www.example.com'],
          hostnameStatuses: [
            {
              hostname: 'www.example.com',
              conditions: [
                {
                  type: 'Available',
                  status: 'True',
                  reason: 'Available',
                  message: '',
                  lastTransitionTime: '2026-01-01T00:00:00Z',
                },
                {
                  type: 'DNSRecordProgrammed',
                  status: 'True',
                  reason: 'Programmed',
                  message: '',
                  lastTransitionTime: '2026-01-01T00:00:00Z',
                },
                {
                  type: 'CertificateReady',
                  status: 'False',
                  reason: 'Pending',
                  message: 'issuing',
                  lastTransitionTime: '2026-01-01T00:00:00Z',
                },
              ],
            },
          ],
          status: { conditions: [{ type: 'Ready', status: 'True', reason: 'Ready', message: '' }] },
        })
      )
    ).toBe(true);
  });

  test('is true while hostname DNS is still being written', () => {
    expect(
      isHttpProxyProvisioning(
        proxy({
          hostnames: ['www.example.com'],
          hostnameStatuses: [
            {
              hostname: 'www.example.com',
              conditions: [
                {
                  type: 'Available',
                  status: 'True',
                  reason: 'Available',
                  message: '',
                  lastTransitionTime: '2026-01-01T00:00:00Z',
                },
                {
                  type: 'DNSRecordProgrammed',
                  status: 'False',
                  reason: 'Pending',
                  message: 'DNS record is pending',
                  lastTransitionTime: '2026-01-01T00:00:00Z',
                },
              ],
            },
          ],
          status: { conditions: [{ type: 'Ready', status: 'True', reason: 'Ready', message: '' }] },
        })
      )
    ).toBe(true);
  });

  test('is false when DNS is conflicted — that only moves after a user action', () => {
    expect(
      isHttpProxyProvisioning(
        proxy({
          hostnames: ['www.example.com'],
          hostnameStatuses: [
            {
              hostname: 'www.example.com',
              conditions: [
                {
                  type: 'Available',
                  status: 'True',
                  reason: 'Available',
                  message: '',
                  lastTransitionTime: '2026-01-01T00:00:00Z',
                },
                {
                  type: 'DNSRecordProgrammed',
                  status: 'False',
                  reason: 'Conflict',
                  message: 'RRset exists',
                  lastTransitionTime: '2026-01-01T00:00:00Z',
                },
              ],
            },
          ],
          status: { conditions: [{ type: 'Ready', status: 'True', reason: 'Ready', message: '' }] },
        })
      )
    ).toBe(false);
  });

  test('is true while ownership verification is still in progress', () => {
    expect(
      isHttpProxyProvisioning(
        proxy({
          hostnames: ['www.example.com'],
          hostnameStatuses: [
            {
              hostname: 'www.example.com',
              conditions: [
                {
                  type: 'Available',
                  status: 'Unknown',
                  reason: 'Pending',
                  message: '',
                  lastTransitionTime: '2026-01-01T00:00:00Z',
                },
                {
                  type: 'DNSRecordProgrammed',
                  status: 'False',
                  reason: 'DomainNotVerified',
                  message: '',
                  lastTransitionTime: '2026-01-01T00:00:00Z',
                },
              ],
            },
          ],
          status: { conditions: [{ type: 'Ready', status: 'True', reason: 'Ready', message: '' }] },
        })
      )
    ).toBe(true);
  });

  test('is false when ownership verification already failed', () => {
    expect(
      isHttpProxyProvisioning(
        proxy({
          hostnames: ['www.example.com'],
          hostnameStatuses: [
            {
              hostname: 'www.example.com',
              conditions: [
                {
                  type: 'Available',
                  status: 'False',
                  reason: 'Failed',
                  message: 'not verified',
                  lastTransitionTime: '2026-01-01T00:00:00Z',
                },
                {
                  type: 'DNSRecordProgrammed',
                  status: 'False',
                  reason: 'DomainNotVerified',
                  message: '',
                  lastTransitionTime: '2026-01-01T00:00:00Z',
                },
              ],
            },
          ],
          status: { conditions: [{ type: 'Ready', status: 'True', reason: 'Ready', message: '' }] },
        })
      )
    ).toBe(false);
  });

  test('stops once the only thing pending is a hostname waiting on the user', () => {
    const cond = (type: string, status: 'True' | 'False', reason: string) => ({
      type,
      status,
      reason,
      message: '',
      lastTransitionTime: '2026-01-01T00:00:00Z',
    });
    expect(
      isHttpProxyProvisioning(
        proxy({
          hostnames: ['*.example.com'],
          status: {
            conditions: [
              cond('Accepted', 'True', 'Accepted'),
              cond('Programmed', 'False', 'Pending'),
              cond('CertificatesReady', 'False', 'CertificatesPending'),
            ],
          },
          hostnameStatuses: [
            {
              hostname: '*.example.com',
              conditions: [cond('Verified', 'False', 'DNSVerificationRequired')],
            },
          ],
        })
      )
    ).toBe(false);
  });

  test('keeps polling for another hostname still issuing beside a blocked one', () => {
    const cond = (type: string, status: 'True' | 'False', reason: string) => ({
      type,
      status,
      reason,
      message: '',
      lastTransitionTime: '2026-01-01T00:00:00Z',
    });
    expect(
      isHttpProxyProvisioning(
        proxy({
          hostnames: ['*.example.com', 'www.example.com'],
          status: {
            conditions: [
              cond('Accepted', 'True', 'Accepted'),
              cond('Programmed', 'False', 'Pending'),
            ],
          },
          hostnameStatuses: [
            {
              hostname: '*.example.com',
              conditions: [cond('Verified', 'False', 'DNSVerificationRequired')],
            },
            {
              hostname: 'www.example.com',
              conditions: [
                cond('Available', 'True', 'Claimed'),
                cond('CertificateReady', 'False', 'Pending'),
              ],
            },
          ],
        })
      )
    ).toBe(true);
  });
});
