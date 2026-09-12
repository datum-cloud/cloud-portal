/**
 * Chat-turn execution proxy for the assistant ("Patch") portal plugin.
 *
 * Every other assistant read (conversation list/history) goes through Milo's
 * aggregated apiserver like any other plugin call — see
 * `app/modules/plugins/client/plugin-sdk-bindings.tsx`'s `usePluginFetch()`.
 * This one route is a deliberate exception: it proxies straight to the
 * assistant's standalone A2A server (`cmd/assistant`, `POST /a2a` in the
 * assistant repo) instead of the aggregated apiserver's
 * `conversations/{id}/sendmessage` subresource.
 *
 * Why: identity forwarding to capability providers (e.g. compute's MCP tool)
 * only works when the assistant's own bearer-token auth middleware runs
 * (`internal/server/middleware.go` in the assistant repo) — that's the one
 * place that captures the caller's raw token and threads it into
 * `capability.CallerIdentity`. Through Kubernetes aggregation, Milo
 * authenticates the caller itself and proxies onward via impersonation
 * headers, not the caller's raw token, so the apiserver path never has a
 * forwardable credential. A2A's authenticator does its own TokenReview
 * against Milo (same mechanism, `internal/auth/tokenreview.go`) — so calling
 * it directly, forwarding the same `session.accessToken` this route's
 * siblings already forward to Milo (see `proxy.ts`), keeps every request
 * Milo-authorized without fighting the aggregation layer.
 *
 * This route only translates protocol framing (A2A's JSON-RPC-over-SSE event
 * sequence → the flat `text_delta`/`tool_start`/`tool_finish`/`done` SSE
 * vocabulary `ui/consumer/src/lib/sse.ts` already parses in the assistant
 * repo) — it does not interpret or store anything.
 */
import type { Variables } from '@/server/types';
import { env } from '@/utils/env/env.server';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';

export const assistantChatRoutes = new Hono<{ Variables: Variables }>();

interface SendMessageBody {
  text: string;
  mentions?: Array<{ kind: string; name: string; apiGroup?: string }>;
}

// Mirrors a2a-go/v2's wire types exactly (github.com/a2aproject/a2a-go/v2/a2a,
// core.go) — only the fields this route reads, not the full protocol.
interface JsonRpcStreamFrame {
  jsonrpc: '2.0';
  id: string;
  result?: {
    task?: unknown;
    statusUpdate?: {
      status: {
        state: string;
        message?: { parts?: A2APart[] };
      };
    };
    artifactUpdate?: {
      artifact: { parts?: A2APart[] };
    };
  };
  error?: { code: number; message: string };
}

interface A2APart {
  text?: string;
  data?: {
    kind?: string;
    phase?: string;
    id?: string;
    name?: string;
    summary?: string;
    ok?: boolean;
    elapsedMs?: number;
  };
}

const TASK_STATE_COMPLETED = 'TASK_STATE_COMPLETED';
const TASK_STATE_FAILED = 'TASK_STATE_FAILED';
const TASK_STATE_CANCELED = 'TASK_STATE_CANCELED';

/**
 * POST /api/assistant-chat/conversations/:contextId/sendmessage
 *
 * Body: `{ text, mentions? }` (same shape the assistant plugin's
 * `SendMessageRequest` already sends). Streams the turn back as SSE frames
 * in the assistant plugin's existing flat event vocabulary.
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
  let body: SendMessageBody;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }
  if (!body.text || !body.text.trim()) {
    return c.json({ error: 'text is required' }, 400);
  }

  const projectId = c.req.query('projectId');
  if (!projectId) {
    return c.json({ error: 'projectId query parameter is required' }, 400);
  }

  const controller = new AbortController();
  c.req.raw.signal?.addEventListener('abort', () => controller.abort());

  const rpcRequestId = crypto.randomUUID();
  const upstreamBody = {
    jsonrpc: '2.0',
    id: rpcRequestId,
    method: 'SendStreamingMessage',
    params: {
      message: {
        messageId: crypto.randomUUID(),
        contextId,
        role: 'ROLE_USER',
        parts: [{ text: body.text }],
        metadata: {
          projectName: projectId,
          ...(body.mentions?.length ? { mentions: body.mentions } : {}),
        },
      },
    },
  };

  let upstream: Response;
  try {
    upstream = await fetch(`${env.server.assistantA2aUrl}/a2a`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(upstreamBody),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return new Response(null, { status: 499 });
    }
    console.error('[assistant-chat] upstream fetch failed:', error);
    return c.json({ error: 'Could not reach the assistant' }, 502);
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '');
    return c.json(
      { error: text || `assistant responded with status ${upstream.status}` },
      upstream.status === 401 || upstream.status === 403 ? upstream.status : 502
    );
  }

  return streamSSE(c, async (stream) => {
    stream.onAbort(() => controller.abort());

    const reader = upstream.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    // The response artifact accumulates as append-only text chunks; track
    // the running text so a `done` frame can carry the final answer even if
    // the very last status-update's message omits it (it usually does — the
    // text already streamed as artifact-update events).
    let accumulatedText = '';

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, '\n');
        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
          const chunk = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf('\n\n');

          const dataLines = chunk
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).replace(/^ /, ''));
          if (dataLines.length === 0) continue;

          let frame: JsonRpcStreamFrame;
          try {
            frame = JSON.parse(dataLines.join('\n'));
          } catch {
            continue;
          }

          if (frame.error) {
            await stream.writeSSE({
              data: JSON.stringify({ type: 'done', state: 'failed', error: frame.error.message }),
            });
            return;
          }

          const result = frame.result;
          if (!result) continue;

          if (result.artifactUpdate) {
            for (const part of result.artifactUpdate.artifact.parts ?? []) {
              if (typeof part.text === 'string' && part.text) {
                accumulatedText += part.text;
                await stream.writeSSE({
                  data: JSON.stringify({ type: 'text_delta', text: part.text }),
                });
              }
            }
            continue;
          }

          if (result.statusUpdate) {
            const { state, message } = result.statusUpdate.status;
            const dataPart = message?.parts?.find((p) => p.data?.kind === 'tool_call');
            if (dataPart?.data) {
              const d = dataPart.data;
              const event =
                d.phase === 'started'
                  ? { type: 'tool_start', id: d.id, name: d.name, summary: d.summary }
                  : {
                      type: 'tool_finish',
                      id: d.id,
                      name: d.name,
                      ok: d.ok ?? false,
                      elapsedMs: d.elapsedMs ?? 0,
                    };
              await stream.writeSSE({ data: JSON.stringify(event) });
              continue;
            }

            if (
              state === TASK_STATE_COMPLETED ||
              state === TASK_STATE_FAILED ||
              state === TASK_STATE_CANCELED
            ) {
              const doneState =
                state === TASK_STATE_COMPLETED
                  ? 'completed'
                  : state === TASK_STATE_FAILED
                    ? 'failed'
                    : 'canceled';
              const finalText = message?.parts
                ?.map((p) => p.text)
                .find((t) => typeof t === 'string' && t);
              await stream.writeSSE({
                data: JSON.stringify({
                  type: 'done',
                  state: doneState,
                  text: finalText ?? (accumulatedText || undefined),
                  error: doneState === 'failed' ? finalText : undefined,
                }),
              });
              return;
            }
          }
        }
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        console.error('[assistant-chat] stream error:', error);
        await stream
          .writeSSE({
            data: JSON.stringify({ type: 'done', state: 'failed', error: 'Stream error' }),
          })
          .catch(() => {});
      }
    } finally {
      reader.releaseLock();
      controller.abort();
    }
  });
});
