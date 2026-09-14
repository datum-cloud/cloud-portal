import { getDnsRecordProgrammedIssue } from './http-proxy.conditions';
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
