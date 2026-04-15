import { projectIdParam } from './schemas';
import { createAllowanceBucketService } from '@/resources/allowance-buckets';
import { createConnectorService } from '@/resources/connectors';
import { createDnsRecordService } from '@/resources/dns-records';
import { createDnsZoneService } from '@/resources/dns-zones';
import { createDomainService } from '@/resources/domains';
import { createExportPolicyService } from '@/resources/export-policies';
import { createHttpProxyService } from '@/resources/http-proxies';
import { createSecretService } from '@/resources/secrets';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { tool } from 'ai';
import { z } from 'zod';

export function createResourceTools() {
  return {
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

    listDnsRecords: tool({
      description:
        'List DNS records in a project, optionally filtered by DNS zone.' +
        ' Call this when the user asks about DNS records, record sets, or what records a zone has.',
      inputSchema: z.object({
        projectId: z.string().describe('The project k8s name'),
        dnsZoneId: z.string().optional().describe('Optional DNS zone name to filter records by'),
      }),
      execute: async ({ projectId, dnsZoneId }: { projectId: string; dnsZoneId?: string }) => {
        const items = await createDnsRecordService().list(projectId, dnsZoneId);
        return items.map(
          ({ rawData: _raw, recordSetId: _rsId, recordSetName: _rsName, ...rest }) => ({
            ...rest,
            url: `/project/${projectId}/dns-zones/${rest.dnsZoneId}/dns-records`,
          })
        );
      },
    }),

    getDomain: tool({
      description:
        'Get detailed information about a single domain including nameservers,' +
        ' verification status, and registration info.',
      inputSchema: z.object({
        projectId: z.string().describe('The project k8s name'),
        domainName: z.string().describe('The domain resource name (k8s name, not the FQDN)'),
      }),
      execute: async ({ projectId, domainName }: { projectId: string; domainName: string }) => {
        const domain = await createDomainService().get(projectId, domainName);
        const { uid: _u, resourceVersion: _rv, namespace: _ns, ...rest } = domain;
        return {
          ...rest,
          status: transformControlPlaneStatus(rest.status),
          url: `/project/${projectId}/domains/${rest.name}`,
        };
      },
    }),

    getHttpProxy: tool({
      description:
        'Get detailed information about a single AI Edge / HTTP proxy including hostnames,' +
        ' origins, WAF mode, basic auth, and per-hostname status.',
      inputSchema: z.object({
        projectId: z.string().describe('The project k8s name'),
        proxyName: z.string().describe('The HTTP proxy resource name'),
      }),
      execute: async ({ projectId, proxyName }: { projectId: string; proxyName: string }) => {
        const proxy = await createHttpProxyService().get(projectId, proxyName);
        const { uid: _u, resourceVersion: _rv, namespace: _ns, ...rest } = proxy;
        return {
          ...rest,
          status: transformControlPlaneStatus(rest.status),
          url: `/project/${projectId}/edge/${rest.name}`,
        };
      },
    }),

    getConnector: tool({
      description:
        'Get detailed information about a single connector including connection details,' +
        ' capabilities, device info, and status.',
      inputSchema: z.object({
        projectId: z.string().describe('The project k8s name'),
        connectorName: z.string().describe('The connector resource name'),
      }),
      execute: async ({
        projectId,
        connectorName,
      }: {
        projectId: string;
        connectorName: string;
      }) => {
        const connector = await createConnectorService().get(projectId, connectorName);
        const { uid: _u, resourceVersion: _rv, namespace: _ns, ...rest } = connector;
        return {
          ...rest,
          status: transformControlPlaneStatus(rest.status),
          url: `/project/${projectId}/connectors`,
        };
      },
    }),

    listQuotas: tool({
      description:
        'List resource quotas and usage for the current project.' +
        ' Call this when the user asks about limits, quotas, or resource usage.',
      inputSchema: projectIdParam,
      execute: async ({ projectId }: { projectId: string }) => {
        const items = await createAllowanceBucketService().list('project', projectId);
        return items.map(({ uid: _u, namespace: _ns, ...rest }) => rest);
      },
    }),
  };
}
