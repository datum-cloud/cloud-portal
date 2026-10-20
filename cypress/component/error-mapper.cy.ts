import { CursorExpiredError } from '@/utils/errors/app-error';
import { mapApiError } from '@/utils/errors/error-mapper';
import { CombinedError } from '@urql/core';

const REQUEST_ID = 'req-123';

function gqltsError(code: string, message: string, extensions: Record<string, unknown> = {}) {
  return { errors: [{ message, extensions: { code, ...extensions } }] };
}

function urqlError(code: string, message: string, extensions: Record<string, unknown> = {}) {
  return new CombinedError({
    graphQLErrors: [{ message, extensions: { code, ...extensions } }],
  });
}

describe('mapApiError gateway error codes', () => {
  describe('gqlts responses', () => {
    it('maps UPSTREAM_TIMEOUT to a 504 that says the request timed out', () => {
      const mapped = mapApiError(gqltsError('UPSTREAM_TIMEOUT', 'upstream timed out'), REQUEST_ID);

      expect(mapped.status).to.equal(504);
      expect(mapped.code).to.equal('UPSTREAM_TIMEOUT');
      expect(mapped.message).to.contain('timed out');
      expect(mapped.requestId).to.equal(REQUEST_ID);
    });

    it('maps UPSTREAM_ERROR to a 502 carrying the upstream status', () => {
      const mapped = mapApiError(
        gqltsError('UPSTREAM_ERROR', 'upstream returned an error', { status: 503 }),
        REQUEST_ID
      );

      expect(mapped.status).to.equal(502);
      expect(mapped.code).to.equal('UPSTREAM_ERROR');
      expect(mapped.upstreamStatus).to.equal(503);
      expect(mapped.message).to.equal('upstream returned an error');
      expect(mapped.requestId).to.equal(REQUEST_ID);
    });

    it('maps UPSTREAM_ERROR without extensions.status to a 502 with no upstream status', () => {
      const mapped = mapApiError(gqltsError('UPSTREAM_ERROR', 'upstream threw'), REQUEST_ID);

      expect(mapped.status).to.equal(502);
      expect(mapped.upstreamStatus).to.equal(undefined);
    });

    it('maps CURSOR_EXPIRED to a CursorExpiredError', () => {
      const mapped = mapApiError(gqltsError('CURSOR_EXPIRED', 'cursor expired'), REQUEST_ID);

      expect(mapped).to.be.instanceOf(CursorExpiredError);
      expect(mapped.status).to.equal(410);
      expect(mapped.code).to.equal('CURSOR_EXPIRED');
      expect(mapped.requestId).to.equal(REQUEST_ID);
    });
  });

  describe('urql CombinedError', () => {
    it('maps UPSTREAM_TIMEOUT to a 504 that says the request timed out', () => {
      const mapped = mapApiError(urqlError('UPSTREAM_TIMEOUT', 'upstream timed out'), REQUEST_ID);

      expect(mapped.status).to.equal(504);
      expect(mapped.code).to.equal('UPSTREAM_TIMEOUT');
      expect(mapped.message).to.contain('timed out');
      expect(mapped.requestId).to.equal(REQUEST_ID);
    });

    it('maps UPSTREAM_ERROR to a 502 carrying the upstream status', () => {
      const mapped = mapApiError(
        urqlError('UPSTREAM_ERROR', 'upstream returned an error', { status: 500 }),
        REQUEST_ID
      );

      expect(mapped.status).to.equal(502);
      expect(mapped.code).to.equal('UPSTREAM_ERROR');
      expect(mapped.upstreamStatus).to.equal(500);
      expect(mapped.requestId).to.equal(REQUEST_ID);
    });

    it('maps CURSOR_EXPIRED to a CursorExpiredError', () => {
      const mapped = mapApiError(urqlError('CURSOR_EXPIRED', 'cursor expired'), REQUEST_ID);

      expect(mapped).to.be.instanceOf(CursorExpiredError);
      expect(mapped.status).to.equal(410);
      expect(mapped.code).to.equal('CURSOR_EXPIRED');
      expect(mapped.requestId).to.equal(REQUEST_ID);
    });
  });
});
