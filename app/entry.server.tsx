import { NonceProvider } from '@/hooks/useNonce';
import { initEnvs } from '@/utils/config/env.config';
import { createReadableStreamFromReadable } from '@react-router/node';
import * as Sentry from '@sentry/react-router';
import { isbot } from 'isbot';
import { PassThrough } from 'node:stream';
import { renderToPipeableStream } from 'react-dom/server';
import type { AppLoadContext, EntryContext } from 'react-router';
import { ServerRouter } from 'react-router';

/**
 * Environment Variables.
 */
initEnvs();

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
        <ServerRouter context={reactRouterContext} url={request.url} />
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

// Export handleError for Sentry error capture
export const handleError = Sentry.createSentryHandleError({
  logErrors: false,
});
