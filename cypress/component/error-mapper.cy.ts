import { GenericError } from '@/components/error/generic';
import { runGqlQuery } from '@/modules/graphql/client';
import { shouldRetryQuery } from '@/modules/tanstack/query';
import { AppError, CursorExpiredError } from '@/utils/errors/app-error';
import { mapApiError } from '@/utils/errors/error-mapper';
import { CombinedError } from '@urql/core';
import { createElement } from 'react';

const REQUEST_ID = 'req-123';

function gqltsError(code: string, message: string, extensions: Record<string, unknown> = {}) {
  return { errors: [{ message, extensions: { code, ...extensions } }] };
}

function urqlError(code: string, message: string, extensions: Record<string, unknown> = {}) {
  return new CombinedError({
    graphQLErrors: [{ message, extensions: { code, ...extensions } }],
  });
}

function responseOnlyError(status: number) {
  return new CombinedError({ response: new Response(null, { status }) });
}

describe('mapApiError gateway error codes', () => {
  describe('gqlts responses', () => {
    it('maps UPSTREAM_TIMEOUT to a 504 that says the request timed out', () => {
      const raw = 'upstream 10.0.0.5:443 timed out';
      const mapped = mapApiError(gqltsError('UPSTREAM_TIMEOUT', raw), REQUEST_ID);

      expect(mapped.status).to.equal(504);
      expect(mapped.code).to.equal('UPSTREAM_TIMEOUT');
      expect(mapped.message).to.equal('The request timed out');
      expect(mapped.requestId).to.equal(REQUEST_ID);
    });

    it('keeps the raw timeout text out of the serialized error', () => {
      const raw = 'upstream 10.0.0.5:443 timed out';
      const payload = mapApiError(gqltsError('UPSTREAM_TIMEOUT', raw), REQUEST_ID).toJSON();
      const serialized = JSON.stringify(payload);

      expect(payload.originalMessage).to.equal(undefined);
      expect(serialized).not.to.contain('10.0.0.5');
    });

    it('maps UPSTREAM_ERROR to a 502 carrying the upstream status', () => {
      const raw = 'upstream returned an error';
      const mapped = mapApiError(gqltsError('UPSTREAM_ERROR', raw, { status: 503 }), REQUEST_ID);

      expect(mapped.status).to.equal(502);
      expect(mapped.code).to.equal('UPSTREAM_ERROR');
      expect(mapped.upstreamStatus).to.equal(503);
      expect(mapped.message).to.equal('The upstream service returned an error');
      expect(mapped.requestId).to.equal(REQUEST_ID);
    });

    it('keeps the raw upstream error text out of the serialized error', () => {
      const raw = 'apiserver said: connection to 10.0.0.6 refused';
      const payload = mapApiError(
        gqltsError('UPSTREAM_ERROR', raw, { status: 503 }),
        REQUEST_ID
      ).toJSON();
      const serialized = JSON.stringify(payload);

      expect(payload.originalMessage).to.equal(undefined);
      expect(serialized).not.to.contain('10.0.0.6');
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
      const mapped = mapApiError(
        urqlError('UPSTREAM_TIMEOUT', 'upstream 10.0.0.5:443 timed out'),
        REQUEST_ID
      );

      expect(mapped.status).to.equal(504);
      expect(mapped.code).to.equal('UPSTREAM_TIMEOUT');
      expect(mapped.message).to.equal('The request timed out');
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
      expect(mapped.message).to.equal('The upstream service returned an error');
      expect(mapped.requestId).to.equal(REQUEST_ID);
    });

    it('maps CURSOR_EXPIRED to a CursorExpiredError', () => {
      const mapped = mapApiError(urqlError('CURSOR_EXPIRED', 'cursor expired'), REQUEST_ID);

      expect(mapped).to.be.instanceOf(CursorExpiredError);
      expect(mapped.status).to.equal(410);
      expect(mapped.code).to.equal('CURSOR_EXPIRED');
      expect(mapped.requestId).to.equal(REQUEST_ID);
    });

    it('maps a response-only 504 to the 504 timeout error', () => {
      const mapped = mapApiError(responseOnlyError(504), REQUEST_ID);

      expect(mapped.status).to.equal(504);
      expect(mapped.code).to.equal('UPSTREAM_TIMEOUT');
      expect(mapped.message).to.equal('The request timed out');
    });

    it('maps a response-only 408 to the 504 timeout error', () => {
      const mapped = mapApiError(responseOnlyError(408), REQUEST_ID);

      expect(mapped.status).to.equal(504);
      expect(mapped.code).to.equal('UPSTREAM_TIMEOUT');
    });

    it('maps a response-only 502 to the 502 upstream error', () => {
      const mapped = mapApiError(responseOnlyError(502), REQUEST_ID);

      expect(mapped.status).to.equal(502);
      expect(mapped.code).to.equal('UPSTREAM_ERROR');
      expect(mapped.upstreamStatus).to.equal(502);
    });

    it('maps a response-only 503 to the 502 upstream error', () => {
      const mapped = mapApiError(responseOnlyError(503), REQUEST_ID);

      expect(mapped.status).to.equal(502);
      expect(mapped.code).to.equal('UPSTREAM_ERROR');
      expect(mapped.upstreamStatus).to.equal(503);
    });

    it('leaves an unremarkable transport status as a generic 500', () => {
      const mapped = mapApiError(responseOnlyError(500), REQUEST_ID);

      expect(mapped.status).to.equal(500);
      expect(mapped.code).to.equal('GRAPHQL_ERROR');
    });
  });

  describe('upstream status parsing', () => {
    const upstreamError = (status: unknown) =>
      mapApiError(gqltsError('UPSTREAM_ERROR', 'upstream error', { status }));

    it('accepts a numeric string status', () => {
      expect(upstreamError('503').upstreamStatus).to.equal(503);
    });

    it('accepts the 100 and 599 boundaries', () => {
      expect(upstreamError(100).upstreamStatus).to.equal(100);
      expect(upstreamError(599).upstreamStatus).to.equal(599);
    });

    it('rejects zero, negative and out-of-range numbers', () => {
      expect(upstreamError(0).upstreamStatus).to.equal(undefined);
      expect(upstreamError(-1).upstreamStatus).to.equal(undefined);
      expect(upstreamError(600).upstreamStatus).to.equal(undefined);
    });

    it('rejects malformed strings', () => {
      expect(upstreamError('000').upstreamStatus).to.equal(undefined);
      expect(upstreamError('099').upstreamStatus).to.equal(undefined);
      expect(upstreamError('600').upstreamStatus).to.equal(undefined);
      expect(upstreamError('50x').upstreamStatus).to.equal(undefined);
    });
  });

  describe('query retry policy', () => {
    it('does not retry a 504 gateway timeout', () => {
      expect(shouldRetryQuery(0, { status: 504 })).to.equal(false);
    });

    it('still retries a 502 once', () => {
      expect(shouldRetryQuery(0, { status: 502 })).to.equal(true);
      expect(shouldRetryQuery(1, { status: 502 })).to.equal(false);
    });
  });

  describe('expired page UI', () => {
    it('shows expired copy and a reload action for 410', () => {
      cy.mount(
        createElement(GenericError, { message: 'The paging cursor has expired', status: 410 })
      );

      cy.contains('This page has expired.').should('be.visible');
      cy.contains('Reload this page to start over').should('be.visible');
      cy.contains('Reload page').should('be.visible');
      cy.contains('Our team has been notified').should('not.exist');
    });
  });

  describe('request id through runGqlQuery', () => {
    it('takes the request id from the error response headers', () => {
      cy.intercept('POST', '/api/graphql/user/me', {
        statusCode: 200,
        headers: { 'x-request-id': 'req-from-proxy' },
        body: {
          errors: [
            {
              message: 'upstream timed out',
              extensions: { code: 'UPSTREAM_TIMEOUT' },
            },
          ],
        },
      }).as('gqlRequest');

      cy.window().then(async () => {
        let caught: unknown;
        try {
          await runGqlQuery(
            'ReviewRequestIdProbe',
            {
              readResourcemanagerMiloapisComV1alpha1Organization: [
                { name: 'probe' },
                { metadata: { name: true } },
              ],
            },
            { type: 'user', userId: 'me' }
          );
        } catch (error) {
          caught = error;
        }

        expect(caught).to.be.instanceOf(AppError);
        expect((caught as AppError).requestId).to.equal('req-from-proxy');
      });
    });
  });
});
