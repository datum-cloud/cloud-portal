import { PrometheusService } from '@/modules/prometheus';
import { createConnectorService } from '@/resources/connectors';
import { createDnsZoneService } from '@/resources/dns-zones';
import { createDomainService } from '@/resources/domains';
import { createExportPolicyService } from '@/resources/export-policies';
import { createHttpProxyService } from '@/resources/http-proxies';
import { createSecretService } from '@/resources/secrets';
import type { Variables } from '@/server/types';
import { env } from '@/utils/env/env.server';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { createAnthropic } from '@ai-sdk/anthropic';
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from 'ai';
import { Hono } from 'hono';
import { z } from 'zod';

export const assistantRoutes = new Hono<{ Variables: Variables }>();

const MAX_MESSAGES = 50;

function buildSystemPrompt(
  projectName?: string,
  orgName?: string,
  projectDisplayName?: string,
  orgDisplayName?: string,
  clientOs?: string
): string {
  const projectLabel = projectDisplayName ?? projectName;
  const orgLabel = orgDisplayName ?? orgName;
  const context =
    projectLabel && orgLabel
      ? `The user is currently working on project "${projectLabel}" (ID: ${projectName}) in organization "${orgLabel}" (ID: ${orgName}).`
      : projectLabel
        ? `The user is currently working on project "${projectLabel}" (ID: ${projectName}).`
        : orgLabel
          ? `The user is currently working in organization "${orgLabel}" (ID: ${orgName}).`
          : '';

  const createLinks = projectName
    ? [
        '',
        'Create URLs for this project (use these when a resource list is empty or the user asks to create one):',
        `- Domains: /project/${projectName}/domains?action=create`,
        `- DNS Zones: /project/${projectName}/dns-zones?action=create`,
        `- AI Edge (HTTP Proxies): /project/${projectName}/edge?action=create`,
        `- Secrets: /project/${projectName}/secrets`,
        `- Connectors: /project/${projectName}/connectors`,
        `- Export Policies: /project/${projectName}/export-policies/new`,
      ]
    : [];

  return [
    'You are a helpful AI assistant embedded in the Datum Cloud portal.',
    context,
    '',
    'Datum Cloud is a cloud infrastructure platform that helps teams manage networking, DNS, domains, secrets, connectors, and AI edge resources across their projects. Here is a quick overview of the platform: https://www.datum.net/docs/overview.md',
    '',
    'You have tools to fetch live resource data from the current project. Use them proactively when the user asks about their resources.',
    'Help users understand their resources, answer questions about the platform, troubleshoot issues, and provide actionable guidance.',
    'When presenting resources to the user:',
    '- Show their human-readable display names where available; use the resource `name` (ID) only when technically relevant (e.g. CLI commands)',
    '- Each resource includes a `url` field — always render the resource name as a markdown link using that URL: e.g. `[My Domain](/project/abc/domains/xyz)`',
    '- When a resource list is empty or the user asks to create a resource, offer a markdown link to the relevant create URL',
    ...createLinks,
    '',
    'Always use markdown formatting in your responses:',
    '- Use `- item` bullet lists (never plain line breaks) for any enumeration',
    '- Use **bold** for emphasis and resource names',
    '- Use `code` for CLI commands, resource names, and identifiers',
    '- Use headers (##) only for longer multi-section responses',
    '- Use tables for complex data comparisons',
    '- Use markdown links (e.g. [My Domain](/project/abc/domains/xyz)) for resource URLs',
    '- Always specify a language identifier for fenced code blocks (e.g. ```bash, ```typescript, ```json, ```yaml)',
    '- The Datum CLI tool is datumctl',
    '- Before suggesting any CLI commands, call getDatumPlatformDocs to look up the correct syntax',
    '- Keep responses concise — avoid unnecessary filler',
    clientOs ? `The user's operating system is: ${clientOs}.` : '',
    "Do not answer questions that are not related to the user's project or resources or Datum",
    'If you cannot answer a question or are unsure, use the openSupportTicket tool to offer the user a pre-filled support ticket. Write a brief subject line and include their original question as the message.',
    `Today is ${new Date().toISOString().slice(0, 10)}.`,
  ]
    .filter(Boolean)
    .join('\n');
}

const projectIdParam = z.object({
  projectId: z.string().describe('The project k8s name (e.g. "my-project-abc123")'),
});

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
    providerOptions: {
      anthropic: {
        thinking: {
          type: 'enabled',
          budgetTokens: 8000,
        },
      },
    },
    stopWhen: stepCountIs(8),
    tools: {
      listDomains: tool({
        description: 'List all domains in a project',
        inputSchema: projectIdParam,
        execute: async ({ projectId }: { projectId: string }) => {
          const items = await createDomainService().list(projectId);
          return items.map(({ uid: _u, resourceVersion: _rv, namespace: _ns, ...rest }) => ({
            ...rest,
            status: transformControlPlaneStatus(rest.status),
            url: `/project/${projectId}/domains/${rest.name}`,
          }));
        },
      }),

      listDnsZones: tool({
        description: 'List all DNS zones in a project',
        inputSchema: projectIdParam,
        execute: async ({ projectId }: { projectId: string }) => {
          const items = await createDnsZoneService().list(projectId);
          return items.map(({ uid: _u, resourceVersion: _rv, namespace: _ns, ...rest }) => ({
            ...rest,
            status: transformControlPlaneStatus(rest.status),
            url: `/project/${projectId}/dns-zones/${rest.name}`,
          }));
        },
      }),

      listHttpProxies: tool({
        description: 'List all AI edge / HTTP proxy resources in a project',
        inputSchema: projectIdParam,
        execute: async ({ projectId }: { projectId: string }) => {
          const items = await createHttpProxyService().list(projectId);
          return items.map(({ uid: _u, resourceVersion: _rv, namespace: _ns, ...rest }) => ({
            ...rest,
            hostnames: rest.hostnames,
            status: transformControlPlaneStatus(rest.status),
            url: `/project/${projectId}/edge/${rest.name}`,
          }));
        },
      }),

      listSecrets: tool({
        description: 'List secret names and metadata in a project (values are never returned)',
        inputSchema: projectIdParam,
        execute: async ({ projectId }: { projectId: string }) => {
          const items = await createSecretService().list(projectId);
          // Explicitly omit `data` so secret values are never sent to the model
          return items.map(
            ({ uid: _u, resourceVersion: _rv, namespace: _ns, data: _d, ...rest }) => ({
              ...rest,
              url: `/project/${projectId}/secrets/${rest.name}`,
            })
          );
        },
      }),

      listConnectors: tool({
        description: 'List all connectors in a project',
        inputSchema: projectIdParam,
        execute: async ({ projectId }: { projectId: string }) => {
          const items = await createConnectorService().list(projectId);
          // Connectors have no detail page — link to the list
          return items.map(({ uid: _u, resourceVersion: _rv, namespace: _ns, ...rest }) => ({
            ...rest,
            status: transformControlPlaneStatus(rest.status),
            url: `/project/${projectId}/connectors`,
          }));
        },
      }),

      listExportPolicies: tool({
        description: 'List all export policies in a project',
        inputSchema: projectIdParam,
        execute: async ({ projectId }: { projectId: string }) => {
          const items = await createExportPolicyService().list(projectId);
          return items.map(({ uid: _u, resourceVersion: _rv, namespace: _ns, ...rest }) => ({
            ...rest,
            url: `/project/${projectId}/export-policies/${rest.name}`,
          }));
        },
      }),

      getProjectMetrics: tool({
        description:
          'Get live traffic metrics for a project: request rate, error rate, and p95 latency across all AI Edge resources. Call this when the user asks about traffic, requests, errors, latency, or performance.',
        inputSchema: z.object({
          projectId: z.string().describe('The project k8s name (e.g. "my-project-abc123")'),
          windowMinutes: z
            .number()
            .int()
            .min(1)
            .max(1440)
            .default(1440)
            .describe('Look-back window in minutes (default 1440 = 24 hours)'),
        }),
        execute: async ({
          projectId,
          windowMinutes,
        }: {
          projectId: string;
          windowMinutes: number;
        }) => {
          if (!env.server.prometheusUrl || !session?.accessToken) {
            return { error: 'Metrics are not available' };
          }

          const prometheus = new PrometheusService({
            baseURL: env.server.prometheusUrl,
            timeout: 15000,
            headers: { Authorization: `Bearer ${session.accessToken}` },
          });

          const projectLabel = `resourcemanager_datumapis_com_project_name="${projectId}"`;
          const window = `${windowMinutes}m`;

          const [rpsResult, errorRpsResult, latencyResult, totalResult] = await Promise.allSettled([
            prometheus.queryForCard(
              `sum(rate(envoy_vhost_vcluster_upstream_rq{${projectLabel}}[${window}]))`,
              'number'
            ),
            prometheus.queryForCard(
              `sum(rate(envoy_vhost_vcluster_upstream_rq{${projectLabel},envoy_response_code_class!~"2xx|1xx"}[${window}]))`,
              'number'
            ),
            prometheus.queryForCard(
              `histogram_quantile(0.95, sum by(le) (rate(envoy_vhost_vcluster_upstream_rq_time_bucket{${projectLabel}}[${window}])))`,
              'number'
            ),
            prometheus.queryForCard(
              `sum(increase(envoy_vhost_vcluster_upstream_rq{${projectLabel}}[${window}]))`,
              'number'
            ),
          ]);

          const get = (r: PromiseSettledResult<{ value: number }>) =>
            r.status === 'fulfilled' ? r.value.value : null;

          const rps = get(rpsResult);
          const errorRps = get(errorRpsResult);
          const latencyMs = get(latencyResult);
          const totalRequests = get(totalResult);

          return {
            windowMinutes,
            requestsPerSecond: rps !== null ? Math.round(rps * 1000) / 1000 : null,
            errorRequestsPerSecond: errorRps !== null ? Math.round(errorRps * 1000) / 1000 : null,
            errorRate:
              rps !== null && errorRps !== null && rps > 0
                ? Math.round((errorRps / rps) * 10000) / 100
                : null,
            p95LatencyMs: latencyMs !== null ? Math.round(latencyMs) : null,
            totalRequests: totalRequests !== null ? Math.round(totalRequests) : null,
            note:
              rps === 0 || rps === null
                ? 'No traffic detected in the selected window — the project may have no active AI Edge traffic.'
                : undefined,
          };
        },
      }),

      getDesktopAppInfo: tool({
        description:
          'Get download and installation instructions for the Datum Desktop app. Call this when the user asks how to install or download the Datum Desktop app.',
        inputSchema: z.object({
          os: z
            .enum(['macos', 'windows', 'linux', 'unknown'])
            .describe("The user's operating system"),
        }),
        execute: async ({ os }: { os: 'macos' | 'windows' | 'linux' | 'unknown' }) => {
          const platforms = {
            macos: {
              os: 'macOS',
              brew: 'brew install --cask datum-cloud/tap/desktop',
              directDownload:
                'https://github.com/datum-cloud/app/releases/latest/download/Datum.dmg',
              downloadPage: 'https://www.datum.net/download/mac-os/',
              instructions:
                'Install via Homebrew (recommended) or download the .dmg installer directly.',
            },
            windows: {
              os: 'Windows',
              directDownload:
                'https://github.com/datum-cloud/app/releases/latest/download/Datum-setup.exe',
              downloadPage: 'https://www.datum.net/download/windows/',
              instructions: 'Download and run the .exe installer.',
            },
            linux: {
              os: 'Linux',
              directDownload:
                'https://github.com/datum-cloud/app/releases/latest/download/Datum.AppImage',
              downloadPage: 'https://www.datum.net/download/linux/',
              instructions:
                'Download the AppImage, make it executable with `chmod +x Datum.AppImage`, then run it.',
            },
          };

          if (os === 'unknown') {
            return {
              description:
                'Datum Desktop exposes local environments to the internet using QUIC-based tunnels.',
              platforms: Object.values(platforms),
              downloadPage: 'https://www.datum.net/download/',
            };
          }

          return {
            description:
              'Datum Desktop exposes local environments to the internet using QUIC-based tunnels.',
            ...platforms[os],
          };
        },
      }),

      getDatumPlatformDocs: tool({
        description:
          'Fetch the full Datum platform documentation including CLI command syntax and usage. Call this before suggesting any datumctl CLI commands to ensure accuracy.',
        inputSchema: z.object({}),
        execute: async () => {
          const res = await fetch('https://www.datum.net/llms-full.txt');
          if (!res.ok) return { error: `Failed to fetch docs: ${res.status}` };
          const text = await res.text();
          return { docs: text };
        },
      }),

      openSupportTicket: tool({
        description:
          'Offer the user a pre-filled HelpScout support ticket when you cannot answer their question or they need human support. Use this when the question is outside your knowledge, you are unsure, or the user asks to contact support.',
        inputSchema: z.object({
          subject: z.string().describe('A concise subject line for the support ticket'),
          message: z.string().describe("The pre-filled message body, based on the user's question"),
        }),
        execute: async ({ subject, message }: { subject: string; message: string }) => ({
          subject,
          message,
        }),
      }),
    },
  });

  return result.toUIMessageStreamResponse({ sendReasoning: true });
});
