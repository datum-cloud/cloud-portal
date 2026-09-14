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
});
