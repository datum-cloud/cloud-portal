import { NonceProvider } from '@/hooks/useNonce';
import { AppError, isUserFacingErrorStatus } from '@/utils/errors/app-error';
import { createReadableStreamFromReadable } from '@react-router/node';
import * as Sentry from '@sentry/react-router';
import { isbot } from 'isbot';
import { PassThrough } from 'node:stream';
import { renderToPipeableStream } from 'react-dom/server';
import type { AppLoadContext, EntryContext, HandleErrorFunction } from 'react-router';
import { ServerRouter, isRouteErrorResponse } from 'react-router';

const ABORT_DELAY = 5_000;

async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  loadContext: AppLoadContext
) {
  const callbackName = isbot(request.headers.get('user-agent')) ? 'onAllReady' : 'onShellReady';

  /**
   * Content Security Policy.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
   */
  const nonce = String(loadContext.cspNonce) ?? undefined;

  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <NonceProvider value={nonce}>
        <ServerRouter nonce={nonce} context={reactRouterContext} url={request.url} />
      </NonceProvider>,
      {
        [callbackName]: () => {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set('Content-Type', 'text/html');

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            })
          );

          // This enables distributed tracing between client and server
          pipe(Sentry.getMetaTagTransformer(body));
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        },
        nonce,
      }
    );

    setTimeout(abort, ABORT_DELAY);
  });
}

// Wrap the handleRequest function with Sentry
export default Sentry.wrapSentryHandleRequest(handleRequest);

// Export handleError for Sentry error capture.
// Skip expected user-facing statuses (401/403/404) and aborted requests — these are
// not bugs. Other 4xx codes (400/409/429/...) reaching this handler usually indicate
// a code path that forgot to catch an error inline, so we still want them captured.
//
// React Router's own `ErrorResponse`s (thrown by the router for things like a
// POST to a route without an `action`, or a path that matches no routes) are
// also dropped when 4xx — they're already converted to a proper HTTP response
// by `handleResourceRequest`/`errorResponseToJson` and are dominated by bot
// and scanner traffic (e.g. `POST //`, `PUT /wp-login.php`) in production.
export const handleError: HandleErrorFunction = (error, { request }) => {
  if (request.signal.aborted) return;

  if (error instanceof AppError && isUserFacingErrorStatus(error.status)) return;

  if (isRouteErrorResponse(error) && error.status >= 400 && error.status < 500) return;

  Sentry.captureException(error);
};
