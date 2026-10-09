import {
  getActionableRecordsToPublish,
  getBlockedHostnames,
  isHeldBackByCustomHostnames,
  getCertificateReadyDisplay,
  getDnsRecordProgrammedIssue,
  getHttpProxyStatus,
  getHostnameOwnershipDisplay,
  getRecordsToPublish,
  getUserDnsRecords,
  isCertificateAwaitingDnsRecord,
  isHostnameDnsInFlight,
  isHostnameOwnershipBlocked,
} from './http-proxy.conditions';
import { ControlPlaneStatus } from '@/resources/base';
import { describe, expect, test } from 'bun:test';

const WRAPPED_ALIAS =
  'status 422: {"error": "RRset testing.mdj-test.online. IN ALIAS: Conflicts with pre-existing RRset"}';

describe('getDnsRecordProgrammedIssue', () => {
  test('treats a PDNS pre-existing RRset as a DNS conflict even without reason=Conflict', () => {
    expect(
      getDnsRecordProgrammedIssue({
        type: 'DNSRecordProgrammed',
        status: 'False',
        reason: 'Failed',
        message: WRAPPED_ALIAS,
      })
    ).toEqual({
      label: 'DNS conflict',
      message:
        'A DNS record you created already exists for this hostname (testing.mdj-test.online). Remove that manual record so Datum can program the ALB-managed one.',
    });
  });

  test('uses the Conflict reason when the operator already classified it', () => {
    const issue = getDnsRecordProgrammedIssue({
      type: 'DNSRecordProgrammed',
      status: 'False',
      reason: 'Conflict',
      message: '',
    });
    expect(issue?.label).toBe('DNS conflict');
    expect(issue?.message).toContain('manual record');
  });

  test('returns undefined while DNS is merely pending with no error', () => {
    expect(
      getDnsRecordProgrammedIssue({
        type: 'DNSRecordProgrammed',
        status: 'False',
        reason: 'Pending',
        message: 'Waiting for DNS record to be programmed',
      })
    ).toBeUndefined();
  });
});

describe('isHostnameDnsInFlight', () => {
  test('is true while the condition is missing or still pending', () => {
    expect(isHostnameDnsInFlight(undefined)).toBe(true);
    expect(
      isHostnameDnsInFlight({
        type: 'DNSRecordProgrammed',
        status: 'False',
        reason: 'Pending',
        message: 'DNS record is pending',
      })
    ).toBe(true);
  });

  test('is false for terminal user-action reasons', () => {
    for (const reason of [
      'Conflict',
      'Failed',
      'DNSAuthorityMissing',
      'NotApplicable',
      'DomainNotVerified',
    ]) {
      expect(
        isHostnameDnsInFlight({
          type: 'DNSRecordProgrammed',
          status: 'False',
          reason,
          message: '',
        })
      ).toBe(false);
    }
  });
});

const condition = (
  type: string,
  status: 'True' | 'False' | 'Unknown',
  reason: string,
  message = ''
) => ({
  type,
  status,
  reason,
  message,
});

describe('getCertificateReadyDisplay', () => {
  test('reads a wildcard in a project without access as not-enabled, not pending', () => {
    expect(
      getCertificateReadyDisplay(condition('CertificateReady', 'False', 'WildcardNotEntitled'))
    ).toBe('not-enabled');
  });

  test('a serving certificate whose renewal fails is renewal-failing, not pending', () => {
    expect(
      getCertificateReadyDisplay(condition('CertificateReady', 'True', 'RenewalFailing'))
    ).toBe('renewal-failing');
  });

  test('keeps the existing states', () => {
    expect(
      getCertificateReadyDisplay(condition('CertificateReady', 'True', 'CertificateIssued'))
    ).toBe('ready');
    expect(
      getCertificateReadyDisplay(condition('CertificateReady', 'False', 'ProvisioningFailed'))
    ).toBe('failed');
    expect(
      getCertificateReadyDisplay(condition('CertificateReady', 'False', 'ChallengeInProgress'))
    ).toBe('challenge');
    expect(getCertificateReadyDisplay(condition('CertificateReady', 'False', 'Pending'))).toBe(
      'pending'
    );
    expect(getCertificateReadyDisplay(undefined)).toBeUndefined();
  });
});

describe('getHostnameOwnershipDisplay', () => {
  test('a claimed hostname is verified', () => {
    expect(
      getHostnameOwnershipDisplay({
        hostname: 'a.example.com',
        conditions: [condition('Available', 'True', 'Claimed')],
      }).state
    ).toBe('verified');
  });

  test('a hostname held by another project is in use, with the reason', () => {
    const display = getHostnameOwnershipDisplay({
      hostname: 'a.s3.example.com',
      conditions: [condition('Available', 'False', 'InUse', 'Reserved by *.s3.example.com')],
    });
    expect(display.state).toBe('in-use');
    expect(display.message).toBe('Reserved by *.s3.example.com');
  });

  test('a wildcard refused for lack of DNS proof says so instead of spinning on Verifying', () => {
    const display = getHostnameOwnershipDisplay({
      hostname: '*.s3.example.com',
      conditions: [condition('Verified', 'False', 'DNSVerificationRequired', 'needs DNS proof')],
    });
    expect(display).toEqual({
      state: 'dns-proof-required',
      label: 'Needs DNS proof',
      message: 'needs DNS proof',
    });
  });

  test('an exact hostname waiting on its Domain stays verifying', () => {
    expect(
      getHostnameOwnershipDisplay({
        hostname: 'a.example.com',
        conditions: [condition('Verified', 'False', 'PendingVerification')],
      }).state
    ).toBe('verifying');
  });

  test('with no conditions yet it is still verifying', () => {
    expect(getHostnameOwnershipDisplay({ hostname: 'a.example.com' }).state).toBe('verifying');
  });
});

describe('records to publish', () => {
  const status = {
    hostname: '*.s3.example.com',
    dnsRecords: [
      {
        name: '*.s3.example.com',
        type: 'CNAME',
        content: 'ruth-fourth-hrkgk.datumproxy.net',
        purpose: 'Routing',
        managedBy: 'User',
        state: 'Present',
      },
      {
        name: '_acme-challenge.s3.example.com',
        type: 'CNAME',
        content: 'k3f9q2x7.acme-dns.example.net',
        purpose: 'Certificate',
        managedBy: 'User',
        state: 'Missing',
      },
      {
        name: '_acme-challenge.s3.example.com',
        type: 'CNAME',
        content: 'k3f9q2x7.acme-dns.example.net',
        purpose: 'Certificate',
        managedBy: 'Platform',
        state: 'Missing',
      },
    ],
  };

  test('lists only records the user publishes', () => {
    expect(getUserDnsRecords(status).map((record) => record.purpose)).toEqual([
      'Routing',
      'Certificate',
    ]);
  });

  test('records to publish are the user records not yet in place', () => {
    expect(getRecordsToPublish(status).map((record) => record.name)).toEqual([
      '_acme-challenge.s3.example.com',
    ]);
  });

  test('in a Datum DNS zone the routing record is left to Datum', () => {
    expect(
      getUserDnsRecords(status, { inDatumZone: true }).map((record) => record.purpose)
    ).toEqual(['Certificate']);
    expect(getRecordsToPublish(status, { inDatumZone: true })).toHaveLength(1);
  });

  test('a hostname without dnsRecords needs nothing', () => {
    expect(getRecordsToPublish({ hostname: 'a.example.com' })).toEqual([]);
  });
});

describe('isHostnameOwnershipBlocked', () => {
  test('only refusals block; verified and verifying do not', () => {
    expect(isHostnameOwnershipBlocked({ state: 'dns-proof-required', label: '' })).toBe(true);
    expect(isHostnameOwnershipBlocked({ state: 'in-use', label: '' })).toBe(true);
    expect(isHostnameOwnershipBlocked({ state: 'unverified', label: '' })).toBe(true);
    expect(isHostnameOwnershipBlocked({ state: 'verified', label: '' })).toBe(false);
    expect(isHostnameOwnershipBlocked({ state: 'verifying', label: '' })).toBe(false);
  });
});

describe('getBlockedHostnames', () => {
  test('separates wildcards without access from refused ownership, ignoring healthy hostnames', () => {
    expect(
      getBlockedHostnames({
        hostnames: ['*.app.example.com', '*.example.com', 'www.example.com'],
        hostnameStatuses: [
          {
            hostname: '*.app.example.com',
            conditions: [
              condition('Available', 'True', 'Claimed'),
              condition('CertificateReady', 'False', 'WildcardNotEntitled'),
            ],
          },
          {
            hostname: '*.example.com',
            conditions: [condition('Verified', 'False', 'DNSVerificationRequired')],
          },
          {
            hostname: 'www.example.com',
            conditions: [
              condition('Available', 'True', 'Claimed'),
              condition('CertificateReady', 'False', 'Pending'),
            ],
          },
        ],
      })
    ).toEqual({
      wildcardsNotEnabled: ['*.app.example.com'],
      ownershipBlocked: ['*.example.com'],
      awaitingDns: [],
    });
  });

  test('a hostname with no status yet is not blocked', () => {
    expect(getBlockedHostnames({ hostnames: ['a.example.com'] })).toEqual({
      wildcardsNotEnabled: [],
      ownershipBlocked: [],
      awaitingDns: [],
    });
  });
});

describe('isCertificateAwaitingDnsRecord', () => {
  const certRecord = (state: string) => ({
    name: '_acme-challenge.app.example.com',
    type: 'CNAME',
    content: 'abc.acme-validation.example.net',
    purpose: 'Certificate',
    managedBy: 'User',
    state,
  });

  test('a pending certificate with its CNAME missing is awaiting DNS', () => {
    expect(
      isCertificateAwaitingDnsRecord({
        hostname: '*.app.example.com',
        conditions: [condition('CertificateReady', 'False', 'Pending')],
        dnsRecords: [certRecord('Missing')],
      })
    ).toBe(true);
  });

  test('once the CNAME is in place it is just issuing', () => {
    expect(
      isCertificateAwaitingDnsRecord({
        hostname: '*.app.example.com',
        conditions: [condition('CertificateReady', 'False', 'Pending')],
        dnsRecords: [certRecord('Present')],
      })
    ).toBe(false);
  });

  test('an issued certificate is never awaiting DNS', () => {
    expect(
      isCertificateAwaitingDnsRecord({
        hostname: '*.app.example.com',
        conditions: [condition('CertificateReady', 'True', 'CertificateIssued')],
        dnsRecords: [certRecord('Missing')],
      })
    ).toBe(false);
  });
});

describe('isHeldBackByCustomHostnames', () => {
  const blockedWildcard = {
    hostname: '*.example.com',
    conditions: [condition('Verified', 'False', 'DNSVerificationRequired')],
  };

  test('accepted with a blocked custom hostname: the default listener is serving', () => {
    expect(
      isHeldBackByCustomHostnames({
        status: {
          conditions: [
            condition('Accepted', 'True', 'Accepted'),
            condition('Programmed', 'False', 'Pending'),
          ],
        },
        hostnames: ['*.example.com'],
        hostnameStatuses: [blockedWildcard],
      })
    ).toBe(true);
  });

  test('not accepted yet: still provisioning', () => {
    expect(
      isHeldBackByCustomHostnames({
        status: { conditions: [condition('Accepted', 'False', 'Pending')] },
        hostnames: ['*.example.com'],
        hostnameStatuses: [blockedWildcard],
      })
    ).toBe(false);
  });

  test('no blocked hostnames: the pending status is taken at face value', () => {
    expect(
      isHeldBackByCustomHostnames({
        status: { conditions: [condition('Accepted', 'True', 'Accepted')] },
        hostnames: [],
      })
    ).toBe(false);
  });
});

describe('getActionableRecordsToPublish', () => {
  const certRecord = {
    name: '_acme-challenge.app.example.com',
    type: 'CNAME',
    content: 'abc.acme-validation.example.net',
    purpose: 'Certificate',
    managedBy: 'User',
    state: 'Missing',
  };

  test('a missing Certificate record counts while the certificate is pending', () => {
    expect(
      getActionableRecordsToPublish({
        hostname: '*.app.example.com',
        conditions: [condition('CertificateReady', 'False', 'Pending')],
        dnsRecords: [certRecord],
      })
    ).toHaveLength(1);
  });

  test('once issued, it only matters for renewal and is not counted', () => {
    expect(
      getActionableRecordsToPublish({
        hostname: '*.app.example.com',
        conditions: [condition('CertificateReady', 'True', 'CertificateIssued')],
        dnsRecords: [certRecord],
      })
    ).toHaveLength(0);
  });
});

describe('isHeldBackByCustomHostnames: a certificate waiting on the user', () => {
  test('a verified wildcard whose certificate CNAME is missing holds the ALB back', () => {
    const status = {
      hostname: '*.wild.example.com',
      conditions: [
        condition('Available', 'True', 'Claimed'),
        condition('CertificateReady', 'False', 'Pending'),
      ],
      dnsRecords: [
        {
          name: '_acme-challenge.wild.example.com',
          type: 'CNAME',
          content: 'abc.acme-validation.example.net',
          purpose: 'Certificate',
          managedBy: 'User',
          state: 'Missing',
        },
      ],
    };
    const proxy = {
      status: {
        conditions: [
          condition('Accepted', 'True', 'Accepted'),
          condition('Programmed', 'False', 'Pending'),
        ],
      },
      hostnames: ['*.wild.example.com'],
      hostnameStatuses: [status],
    };
    expect(getBlockedHostnames(proxy).awaitingDns).toEqual(['*.wild.example.com']);
    expect(isHeldBackByCustomHostnames(proxy)).toBe(true);
  });
});

describe('getHttpProxyStatus', () => {
  const programmedPending = {
    type: 'Programmed',
    status: 'False' as const,
    reason: 'Pending',
    message: 'Waiting for the proxy to be programmed',
  };

  test.each(['Invalid', 'DerivedResourceInvalid'])(
    'fails a proxy whose Accepted reason is %s, with the condition message',
    (reason) => {
      const result = getHttpProxyStatus({
        conditions: [
          { type: 'Accepted', status: 'False', reason, message: 'spec.rules[0] is invalid' },
          programmedPending,
        ],
      });
      expect(result.status).toBe(ControlPlaneStatus.Error);
      expect(result.message).toBe('spec.rules[0] is invalid');
      expect(result.retryRef).toBeUndefined();
    }
  );

  test('keeps a retrying proxy pending and exposes the support reference', () => {
    const result = getHttpProxyStatus({
      conditions: [
        { type: 'Accepted', status: 'True', reason: 'Accepted', message: '' },
        {
          ...programmedPending,
          message:
            'The HTTPProxy could not be programmed due to an internal error and will be retried (ref: 1a2b3c4d)',
        },
      ],
    });
    expect(result.status).toBe(ControlPlaneStatus.Pending);
    expect(result.retryRef).toBe('1a2b3c4d');
  });

  test('leaves a proxy that is still provisioning pending', () => {
    const result = getHttpProxyStatus({
      conditions: [
        { type: 'Accepted', status: 'True', reason: 'Accepted', message: '' },
        programmedPending,
      ],
    });
    expect(result.status).toBe(ControlPlaneStatus.Pending);
    expect(result.retryRef).toBeUndefined();
  });

  test('does not fail on other Accepted=False reasons', () => {
    const result = getHttpProxyStatus({
      conditions: [
        { type: 'Accepted', status: 'False', reason: 'Pending', message: 'Waiting' },
        programmedPending,
      ],
    });
    expect(result.status).toBe(ControlPlaneStatus.Pending);
  });

  test('treats a missing status as pending', () => {
    expect(getHttpProxyStatus(undefined).status).toBe(ControlPlaneStatus.Pending);
  });
});
