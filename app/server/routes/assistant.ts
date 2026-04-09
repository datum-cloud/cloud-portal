import { buildSystemPrompt, createAssistantTools } from '@/modules/assistant';
import type { Variables } from '@/server/types';
import { env } from '@/utils/env/env.server';
import { createAnthropic } from '@ai-sdk/anthropic';
import { convertToModelMessages, smoothStream, stepCountIs, streamText, type UIMessage } from 'ai';
import { Hono } from 'hono';

export const assistantRoutes = new Hono<{ Variables: Variables }>();

const MAX_MESSAGES = 50;

assistantRoutes.post('/', async (c) => {
  if (!env.server.anthropicApiKey) {
    return c.json({ error: 'AI assistant is not configured' }, 503);
  }

  const body = await c.req.json();
  const { messages, projectName, orgName, projectDisplayName, orgDisplayName, clientOs } = body as {
    messages: UIMessage[];
    projectName?: string;
    orgName?: string;
    projectDisplayName?: string;
    orgDisplayName?: string;
    clientOs?: string;
  };

  const session = c.get('session');

  const anthropic = createAnthropic({ apiKey: env.server.anthropicApiKey });
  const model = env.server.anthropicModel ?? 'claude-sonnet-4-6';

  const result = streamText({
    model: anthropic(model),
    system: buildSystemPrompt(projectName, orgName, projectDisplayName, orgDisplayName, clientOs),
    messages: await convertToModelMessages(messages.slice(-MAX_MESSAGES)),
    experimental_transform: smoothStream({ chunking: 'word', delayInMs: 40 }),
    providerOptions: {
      anthropic: {
        thinking: {
          type: 'enabled',
          budgetTokens: 8000,
        },
      },
    },
    stopWhen: stepCountIs(8),
    tools: createAssistantTools({ accessToken: session?.accessToken }),
  });

  return result.toUIMessageStreamResponse({ sendReasoning: true });
});
