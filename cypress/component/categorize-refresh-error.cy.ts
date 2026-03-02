import { categorizeRefreshError, RefreshErrorType } from '@/utils/errors/auth';

describe('categorizeRefreshError', () => {
  describe('REFRESH_TOKEN_REVOKED', () => {
    it('recognizes invalid_grant in the error message', () => {
      const error = new Error('invalid_grant');
      expect(categorizeRefreshError(error).type).to.equal(RefreshErrorType.REFRESH_TOKEN_REVOKED);
    });

    it('recognizes token has been revoked', () => {
      const error = new Error('token has been revoked by the user');
      expect(categorizeRefreshError(error).type).to.equal(RefreshErrorType.REFRESH_TOKEN_REVOKED);
    });

    it('recognizes refresh token is invalid', () => {
      const error = new Error('refresh token is invalid');
      expect(categorizeRefreshError(error).type).to.equal(RefreshErrorType.REFRESH_TOKEN_REVOKED);
    });

    it('recognizes Zitadel invalid_grant via oauth .code field', () => {
      // Zitadel sometimes returns the OAuth error code in a structured field
      // rather than the message string
      const error = Object.assign(new Error('invalid_request'), { code: 'invalid_grant' });
      expect(categorizeRefreshError(error).type).to.equal(RefreshErrorType.REFRESH_TOKEN_REVOKED);
    });

    it('recognizes Zitadel Errors.OIDCSession.RefreshTokenInvalid via oauth .description field', () => {
      // Zitadel sends: error=invalid_request, description=Errors.OIDCSession.RefreshTokenInvalid
      // This was the multi-pod rotation race error that was previously logged as UNKNOWN_ERROR
      const error = Object.assign(new Error('invalid_request'), {
        code: 'invalid_request',
        description: 'Errors.OIDCSession.RefreshTokenInvalid',
      });
      expect(categorizeRefreshError(error).type).to.equal(RefreshErrorType.REFRESH_TOKEN_REVOKED);
    });

    it('is case-insensitive for oauth .description matching', () => {
      const error = Object.assign(new Error('invalid_request'), {
        description: 'errors.oidcsession.refreshtokeninvalid',
      });
      expect(categorizeRefreshError(error).type).to.equal(RefreshErrorType.REFRESH_TOKEN_REVOKED);
    });

    it('preserves the original error on the RefreshError', () => {
      const original = new Error('invalid_grant');
      const result = categorizeRefreshError(original);
      expect(result.originalError).to.equal(original);
    });
  });

  describe('REFRESH_TOKEN_EXPIRED', () => {
    it('recognizes expired in the error message', () => {
      const error = new Error('token is expired');
      expect(categorizeRefreshError(error).type).to.equal(RefreshErrorType.REFRESH_TOKEN_EXPIRED);
    });

    it('recognizes token is no longer valid', () => {
      const error = new Error('token is no longer valid');
      expect(categorizeRefreshError(error).type).to.equal(RefreshErrorType.REFRESH_TOKEN_EXPIRED);
    });
  });

  describe('NETWORK_ERROR', () => {
    it('recognizes network error', () => {
      const error = new Error('network error');
      expect(categorizeRefreshError(error).type).to.equal(RefreshErrorType.NETWORK_ERROR);
    });

    it('recognizes fetch failure', () => {
      const error = new Error('fetch failed');
      expect(categorizeRefreshError(error).type).to.equal(RefreshErrorType.NETWORK_ERROR);
    });

    it('recognizes ECONNREFUSED', () => {
      const error = new Error('ECONNREFUSED 127.0.0.1:3000');
      expect(categorizeRefreshError(error).type).to.equal(RefreshErrorType.NETWORK_ERROR);
    });

    it('recognizes timeout', () => {
      const error = new Error('request timeout');
      expect(categorizeRefreshError(error).type).to.equal(RefreshErrorType.NETWORK_ERROR);
    });
  });

  describe('UNKNOWN_ERROR', () => {
    it('falls back to UNKNOWN_ERROR for unrecognized messages', () => {
      const error = new Error('something completely unexpected');
      expect(categorizeRefreshError(error).type).to.equal(RefreshErrorType.UNKNOWN_ERROR);
    });

    it('handles non-Error input (string)', () => {
      const result = categorizeRefreshError('some string error');
      expect(result.type).to.equal(RefreshErrorType.UNKNOWN_ERROR);
    });

    it('handles non-Error input (object)', () => {
      const result = categorizeRefreshError({ status: 500 });
      expect(result.type).to.equal(RefreshErrorType.UNKNOWN_ERROR);
    });
  });

  describe('REVOKED takes precedence over EXPIRED', () => {
    it('matches REVOKED before EXPIRED when both keywords present', () => {
      const error = new Error('invalid_grant: token is expired');
      expect(categorizeRefreshError(error).type).to.equal(RefreshErrorType.REFRESH_TOKEN_REVOKED);
    });
  });
});
