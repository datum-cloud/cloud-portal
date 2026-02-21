import { isK8sStatus, mapK8sReasonToCode, parseK8sStatusError } from '@/modules/axios/k8s-error';

describe('isK8sStatus', () => {
  it('returns true for valid K8s Status object', () => {
    expect(
      isK8sStatus({
        kind: 'Status',
        apiVersion: 'v1',
        status: 'Failure',
        message: 'not found',
        code: 404,
      })
    ).to.equal(true);
  });

  it('returns false when kind is not Status', () => {
    expect(isK8sStatus({ kind: 'Project', apiVersion: 'v1', message: 'test', code: 200 })).to.equal(
      false
    );
  });

  it('returns false when message is missing', () => {
    expect(isK8sStatus({ kind: 'Status', code: 404 })).to.equal(false);
  });

  it('returns false when code is missing', () => {
    expect(isK8sStatus({ kind: 'Status', message: 'not found' })).to.equal(false);
  });

  it('returns false when code is not a number', () => {
    expect(isK8sStatus({ kind: 'Status', message: 'test', code: '404' })).to.equal(false);
  });

  it('returns false for null', () => {
    expect(isK8sStatus(null)).to.equal(false);
  });

  it('returns false for non-object', () => {
    expect(isK8sStatus('Status')).to.equal(false);
  });
});

describe('mapK8sReasonToCode', () => {
  it('maps AlreadyExists to CONFLICT', () => {
    expect(mapK8sReasonToCode('AlreadyExists', 409)).to.equal('CONFLICT');
  });

  it('maps NotFound to NOT_FOUND', () => {
    expect(mapK8sReasonToCode('NotFound', 404)).to.equal('NOT_FOUND');
  });

  it('maps Conflict to CONFLICT', () => {
    expect(mapK8sReasonToCode('Conflict', 409)).to.equal('CONFLICT');
  });

  it('maps Forbidden to AUTHORIZATION_ERROR', () => {
    expect(mapK8sReasonToCode('Forbidden', 403)).to.equal('AUTHORIZATION_ERROR');
  });

  it('maps Unauthorized to AUTHENTICATION_ERROR', () => {
    expect(mapK8sReasonToCode('Unauthorized', 401)).to.equal('AUTHENTICATION_ERROR');
  });

  it('maps Invalid to VALIDATION_ERROR', () => {
    expect(mapK8sReasonToCode('Invalid', 422)).to.equal('VALIDATION_ERROR');
  });

  it('maps BadRequest to VALIDATION_ERROR', () => {
    expect(mapK8sReasonToCode('BadRequest', 400)).to.equal('VALIDATION_ERROR');
  });

  it('maps TooManyRequests to RATE_LIMIT_EXCEEDED', () => {
    expect(mapK8sReasonToCode('TooManyRequests', 429)).to.equal('RATE_LIMIT_EXCEEDED');
  });

  it('falls back to HTTP 400 as VALIDATION_ERROR', () => {
    expect(mapK8sReasonToCode(undefined, 400)).to.equal('VALIDATION_ERROR');
  });

  it('falls back to HTTP 401 as AUTHENTICATION_ERROR', () => {
    expect(mapK8sReasonToCode(undefined, 401)).to.equal('AUTHENTICATION_ERROR');
  });

  it('falls back to HTTP 403 as AUTHORIZATION_ERROR', () => {
    expect(mapK8sReasonToCode(undefined, 403)).to.equal('AUTHORIZATION_ERROR');
  });

  it('falls back to HTTP 404 as NOT_FOUND', () => {
    expect(mapK8sReasonToCode(undefined, 404)).to.equal('NOT_FOUND');
  });

  it('falls back to HTTP 409 as CONFLICT', () => {
    expect(mapK8sReasonToCode(undefined, 409)).to.equal('CONFLICT');
  });

  it('falls back to HTTP 429 as RATE_LIMIT_EXCEEDED', () => {
    expect(mapK8sReasonToCode(undefined, 429)).to.equal('RATE_LIMIT_EXCEEDED');
  });

  it('falls back to API_ERROR for unknown status', () => {
    expect(mapK8sReasonToCode(undefined, 500)).to.equal('API_ERROR');
  });
});

describe('parseK8sStatusError', () => {
  it('parses K8s Status with message and reason', () => {
    const result = parseK8sStatusError(
      {
        kind: 'Status',
        apiVersion: 'v1',
        status: 'Failure',
        message:
          'admission webhook "vdomain-v1alpha.kb.io" denied the request: domains.networking.datumapis.com "test" is forbidden: cannot delete Domain while in use',
        reason: 'Forbidden',
        code: 403,
      },
      403
    );

    expect(result.message).to.equal('Cannot delete Domain while in use');
    expect(result.code).to.equal('AUTHORIZATION_ERROR');
    expect(result.k8sReason).to.equal('Forbidden');
    expect(result.originalMessage).to.include('admission webhook');
  });

  it('parses K8s Status with details and causes', () => {
    const result = parseK8sStatusError(
      {
        kind: 'Status',
        apiVersion: 'v1',
        status: 'Failure',
        message: 'Invalid resource',
        reason: 'Invalid',
        code: 422,
        details: {
          kind: 'DNSZone',
          name: 'example',
          group: 'dns.networking.miloapis.com',
          causes: [
            {
              field: 'spec.domain',
              message: 'must be a valid domain',
              reason: 'FieldValueInvalid',
            },
          ],
        },
      },
      422
    );

    expect(result.code).to.equal('VALIDATION_ERROR');
    expect(result.k8sDetails).to.deep.equal({
      kind: 'DNSZone',
      name: 'example',
      group: 'dns.networking.miloapis.com',
    });
    expect(result.details).to.have.length(1);
    expect(result.details?.[0].path).to.deep.equal(['spec', 'domain']);
    expect(result.details?.[0].message).to.equal('must be a valid domain');
    expect(result.details?.[0].code).to.equal('FieldValueInvalid');
  });

  it('handles K8s Status without details', () => {
    const result = parseK8sStatusError(
      {
        kind: 'Status',
        apiVersion: 'v1',
        status: 'Failure',
        message: 'Something went wrong',
        code: 500,
      },
      500
    );

    expect(result.message).to.equal('Something went wrong');
    expect(result.code).to.equal('API_ERROR');
    expect(result.k8sReason).to.equal(undefined);
    expect(result.k8sDetails).to.equal(undefined);
    expect(result.details).to.equal(undefined);
  });

  it('handles K8s Status with empty causes array', () => {
    const result = parseK8sStatusError(
      {
        kind: 'Status',
        apiVersion: 'v1',
        status: 'Failure',
        message: 'Not found',
        reason: 'NotFound',
        code: 404,
        details: { kind: 'Project', causes: [] },
      },
      404
    );

    expect(result.code).to.equal('NOT_FOUND');
    expect(result.details).to.equal(undefined);
    expect(result.k8sDetails).to.deep.equal({ kind: 'Project', name: undefined, group: undefined });
  });

  it('handles cause without field', () => {
    const result = parseK8sStatusError(
      {
        kind: 'Status',
        apiVersion: 'v1',
        status: 'Failure',
        message: 'Invalid',
        reason: 'Invalid',
        code: 422,
        details: {
          causes: [{ message: 'something wrong' }],
        },
      },
      422
    );

    expect(result.details?.[0].path).to.deep.equal([]);
    expect(result.details?.[0].message).to.equal('something wrong');
  });
});
