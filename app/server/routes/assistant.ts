import { buildSystemPrompt, createAssistantTools } from '@/modules/assistant';
import { logger } from '@/modules/logger';
import {
  buildAssistantUsageEvents,
  emitUsageEvents,
  resolveBillingContext,
  shouldSkipEmit,
} from '@/modules/usage';
import type { Variables } from '@/server/types';
import { env } from '@/utils/env/env.server';
import { createAnthropic } from '@ai-sdk/anthropic';
import { convertToModelMessages, smoothStream, stepCountIs, streamText, type UIMessage } from 'ai';
import { Hono } from 'hono';

export const assistantRoutes = new Hono<{ Variables: Variables }>();

const MAX_MESSAGES = 50;

assistantRoutes.post('/', async (c) => {
  if (!env.public.chatbotEnabled || !env.server.anthropicApiKey) {
    return c.json({ error: 'AI assistant is not configured' }, 503);
  }

  const body = await c.req.json();
  const { id, messages, projectName, orgName, projectDisplayName, orgDisplayName, clientOs } =
    body as {
      id?: string;
      messages: UIMessage[];
      projectName?: string;
      orgName?: string;
      projectDisplayName?: string;
      orgDisplayName?: string;
      clientOs?: string;
    };

  const session = c.get('session');

  if (!session?.sub) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  const userMessageText = lastUserMessage?.parts
    ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join(' ');

  try {
    const anthropic = createAnthropic({ apiKey: env.server.anthropicApiKey });
    const model = env.server.anthropicModel ?? 'claude-sonnet-4-6';

    const result = streamText({
      model: anthropic(model),
      system: buildSystemPrompt(projectName, orgName, projectDisplayName, orgDisplayName, clientOs),
      messages: await convertToModelMessages(messages.slice(-MAX_MESSAGES)),
      maxOutputTokens: 4096,
      experimental_transform: smoothStream({ chunking: 'word', delayInMs: 40 }),
      providerOptions: {
        anthropic: {
          thinking: {
            type: 'enabled',
            budgetTokens: 8000,
          },
          metadata: { user_id: session.sub },
        },
      },
      stopWhen: stepCountIs(8),
      tools: createAssistantTools({ accessToken: session.accessToken }),
    });

    result.response.then(undefined, (err: unknown) => {
      logger.error('assistant stream failed', {
        userId: session.sub,
        projectId: projectName,
        model,
        userMessage: userMessageText,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    });

    result.usage.then(
      (usage) => {
        logger.info('assistant request completed', {
          userId: session.sub,
          projectId: projectName,
          model,
          userMessage: userMessageText,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
        });

        // Emit usage events to the Milo durable usage pipeline. No-op
        // when USAGE_GATEWAY_URL is unset; never throws (the emitter
        // logs and resolves on failure). Project-scoped only — the
        // pipeline attributes via BillingAccountBinding on `projectRef`,
        // so we cannot bill chats with no project context.
        if (!projectName || !id) return;
        void (async () => {
          // Soft pre-emit gate: if we can prove there's no Active
          // BillingAccountBinding for this project, drop locally rather
          // than letting the Gateway quarantine and page. Failure to
          // resolve (no orgName, RBAC, network) falls through to emit —
          // the Gateway is authoritative.
          const ctx = await resolveBillingContext({ orgName, projectName });
          if (ctx.status === 'lookup-error') {
            logger.warn('usage.billing-context.lookup-failed', {
              projectId: projectName,
              orgId: orgName,
              error: ctx.errorMessage,
            });
          }
          if (shouldSkipEmit(ctx)) {
            logger.info('usage.emit.skipped', {
              reason: ctx.status,
              projectId: projectName,
              orgId: orgName,
              bindingName: ctx.bindingName,
            });
            return;
          }

          const events = buildAssistantUsageEvents({
            projectName,
            conversationId: id,
            model,
            region: env.server.usageRegion,
            tokens: {
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
              cachedInputTokens: (usage as { cachedInputTokens?: number }).cachedInputTokens,
              cacheCreationInputTokens: (usage as { cacheCreationInputTokens?: number })
                .cacheCreationInputTokens,
            },
          });
          await emitUsageEvents(events);
        })();
      },
      () => {} // already logged via result.response rejection
    );

    return result.toUIMessageStreamResponse({ sendReasoning: true });
  } catch (err) {
    logger.error('assistant request failed', {
      userId: session.sub,
      projectId: projectName,
      userMessage: userMessageText,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return c.json({ error: 'Failed to start assistant' }, 500);
  }
});
