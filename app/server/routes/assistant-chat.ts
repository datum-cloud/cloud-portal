/**
 * Chat-turn execution proxy for the assistant ("Patch") portal plugin.
 *
 * Every other assistant read (conversation list/history) goes through Milo's
 * aggregated apiserver like any other plugin call — see
 * `app/modules/plugins/client/plugin-sdk-bindings.tsx`'s `usePluginFetch()`.
 * This one route is a deliberate exception: it proxies straight to the
 * assistant's standalone backend (`cmd/assistant`,
 * `POST /chat/conversations/{contextId}/sendmessage` in the assistant repo)
 * instead of the aggregated apiserver's `conversations/{id}/sendmessage`
 * subresource.
 *
 * Why: identity forwarding to capability providers (e.g. compute's MCP tool)
 * only works when the assistant's own bearer-token auth middleware runs
 * (`internal/server/middleware.go` in the assistant repo) — that's the one
 * place that captures the caller's raw token and threads it into
 * `capability.CallerIdentity`. Through Kubernetes aggregation, Milo
 * authenticates the caller itself and proxies onward via impersonation
 * headers, not the caller's raw token, so the apiserver path never has a
 * forwardable credential. This route's upstream authenticates the same way
 * `/a2a` does (a TokenReview against Milo, `internal/auth/tokenreview.go`) —
 * so calling it directly, forwarding the same `session.accessToken` this
 * route's siblings already forward to Milo (see `proxy.ts`), keeps every
 * request Milo-authorized without fighting the aggregation layer.
 *
 * Unlike the route this replaced, this one carries no protocol knowledge: the
 * assistant repo's `internal/server/chat_stream.go` already speaks the flat
 * `text_delta`/`tool_start`/`tool_finish`/`done` vocabulary
 * `ui/consumer/src/lib/sse.ts` parses, so this route just forwards the request
 * and pipes the response body straight through, the same way `proxy.ts`
 * forwards to Milo. If the assistant repo ever changes the wire protocol
 * behind that endpoint, this file does not need to change.
 */
import { logger } from '@/modules/logger';
import type { Variables } from '@/server/types';
import { encodePathSegments, isDns1123Label, isDns1123Subdomain } from '@/server/upstream-params';
import { env } from '@/utils/env/env.server';
import { Hono } from 'hono';

export const assistantChatRoutes = new Hono<{ Variables: Variables }>();

/**
 * POST /api/assistant-chat/conversations/:contextId/sendmessage
 *
 * Forwards to the assistant's own
 * `POST /chat/conversations/:contextId/sendmessage`, same body, same
 * `projectId` query param, same bearer token. Streams the response back
 * unmodified.
 *
 * `contextId` names a conversation object, so it must be a Kubernetes object
 * name; `projectId` must be a project name. Anything else is refused before
 * the upstream URL is built, and only `projectId` is forwarded as a query.
 */
assistantChatRoutes.post('/conversations/:contextId/sendmessage', async (c) => {
  const session = c.get('session');
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  if (!env.server.assistantA2aUrl) {
    return c.json({ error: 'Assistant chat is not configured' }, 503);
  }

  const contextId = c.req.param('contextId');
  if (!isDns1123Subdomain(contextId)) {
    return c.json({ error: 'Invalid conversation id' }, 400);
  }
  const projectId = c.req.query('projectId');
  if (projectId !== undefined && !isDns1123Label(projectId)) {
    return c.json({ error: 'Invalid project id' }, 400);
  }

  const upstreamUrl = new URL(
    `${env.server.assistantA2aUrl}${encodePathSegments('chat', 'conversations', contextId, 'sendmessage')}`
  );
  if (projectId !== undefined) upstreamUrl.searchParams.set('projectId', projectId);

  const controller = new AbortController();
  c.req.raw.signal?.addEventListener('abort', () => controller.abort());

  // Read once and forward verbatim: this route doesn't need to parse the body
  // to proxy it, only the upstream does.
  const requestBody = await c.req.text();

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: requestBody,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return new Response(null, { status: 499 });
    }
    logger.error('[assistant-chat] upstream fetch failed', error as Error, {
      requestId: c.get('requestId'),
    });
    return c.json({ error: 'Could not reach the assistant' }, 502);
  }

  // Same header-stripping proxy.ts applies to every other upstream response:
  // an encoding header describing the assistant's own connection to us would
  // otherwise double-apply on ours to the browser.
  const headers = new Headers(upstream.headers);
  headers.delete('content-encoding');
  headers.delete('transfer-encoding');

  return new Response(upstream.body, { status: upstream.status, headers });
});
