/**
 * Cloud-portal's concrete AssistantConfig ("Patch"). This is the host-specific
 * layer that stays in cloud-portal while the presentational pieces live in
 * datum-ui — staff-portal supplies its own equivalent (different suggestions,
 * tool labels, a model picker, …).
 */
import { SUGGESTIONS } from './constants';
import type { AssistantConfig } from './types';
import { openSupportMessage } from '@/utils/open-support-message';
import { defaultRenderLink } from '@datum-cloud/datum-ui/assistant';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { getToolName } from 'ai';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';

/** Tool name → progress label shown while a cloud tool call is running. */
export const CLOUD_TOOL_LABELS: Record<string, string> = {
  listDomains: 'Loading domains…',
  listDnsZones: 'Loading DNS zones…',
  listDnsRecords: 'Loading DNS records…',
  listHttpProxies: 'Loading AI edge resources…',
  listSecrets: 'Loading secrets…',
  listConnectors: 'Loading connectors…',
  listExportPolicies: 'Loading export policies…',
  getDomain: 'Fetching domain details…',
  getHttpProxy: 'Fetching AI edge details…',
  getConnector: 'Fetching connector details…',
  getProjectMetrics: 'Fetching metrics…',
  queryActivityLogs: 'Loading activity logs…',
  listQuotas: 'Loading quotas…',
  listBillingAccounts: 'Loading billing accounts…',
  getBillingAccount: 'Fetching billing account…',
  getProjectBillingBinding: 'Checking project billing…',
  listPaymentMethods: 'Loading payment methods…',
  getProjectUsage: 'Fetching usage data…',
  getOrgUsage: 'Fetching org usage…',
  getDesktopAppInfo: 'Getting app info…',
  getDatumPlatformDocs: 'Reading docs…',
  openSupportTicket: 'Preparing support ticket…',
};

export const CLOUD_ASSISTANT_CONFIG: AssistantConfig = {
  greeting: (name) => `Hey there${name ? `, ${name}` : ''}`,
  suggestions: [...SUGGESTIONS],
  showReasoning: true,
  // Cloud has no model picker — the server chooses the model.
  modelSelector: false,
  toolLabels: CLOUD_TOOL_LABELS,
  // Internal routes use the router so navigation stays a client transition;
  // external links fall back to the generic new-tab renderer.
  renderLink: (props) => {
    if (props.href?.startsWith('/')) {
      return (
        <Link className="underline" to={props.href}>
          {props.children}
        </Link>
      );
    }
    return defaultRenderLink(props);
  },
  // Turn a completed `openSupportTicket` tool call into an actionable button.
  renderToolOutput: (part) => {
    if (getToolName(part) !== 'openSupportTicket' || part.state !== 'output-available') return null;
    const result = part.output as { subject: string; message: string };
    return (
      <div className="mt-2">
        <Button
          onClick={() => openSupportMessage({ subject: result.subject, text: result.message })}
          className="mb-2">
          Open Support Ticket
          <Icon icon={ArrowRight} className="size-4" />
        </Button>
      </div>
    );
  },
};
