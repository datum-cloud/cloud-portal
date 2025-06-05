import { NonceProvider } from '@/hooks/useNonce';
import { createReadableStreamFromReadable } from '@react-router/node';
import { isbot } from 'isbot';
import { PassThrough } from 'node:stream';
import { renderToPipeableStream } from 'react-dom/server';
import type { AppLoadContext, EntryContext } from 'react-router';
import { ServerRouter } from 'react-router';

export const streamTimeout = 5_000;

function isBot(userAgent: string | null): boolean {
  if (!userAgent) return false;

  // Skip bot detection for Cypress tests
  if (/Cypress|axios/.test(userAgent)) return false;

  return isbot(userAgent);
}

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  loadContext: AppLoadContext
) {
  let userAgent = request.headers.get('user-agent');
  const callbackName = isBot(userAgent) || routerContext.isSpaMode ? 'onAllReady' : 'onShellReady';

  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <NonceProvider value={loadContext.cspNonce}>
        <ServerRouter nonce={loadContext.cspNonce} context={routerContext} url={request.url} />
      </NonceProvider>,
      {
        nonce: loadContext.cspNonce,
        [callbackName]() {
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

          pipe(body);
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
      }
    );

    setTimeout(abort, streamTimeout + 1000);
  });
}
