import { ProxyDeleteDnsPreview } from '@/features/edge/proxy/proxy-delete-dns-preview';
import { dnsRecordKeys } from '@/resources/dns-records';
import { dnsZoneKeys } from '@/resources/dns-zones';
import type { HttpProxy } from '@/resources/http-proxies';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const PROJECT = 'proj-1';

const dnsStatus = (hostname: string, status: 'True' | 'False', reason: string) => ({
  hostname,
  conditions: [
    {
      type: 'DNSRecordProgrammed',
      status,
      reason,
      message: '',
      lastTransitionTime: '2026-09-10T00:00:00Z',
    },
  ],
});

/** www.example.com is both an ALB hostname and the name of the user's own A record. */
const proxy = {
  name: 'edge-proxy',
  endpoint: 'http://203.0.113.10',
  hostnames: ['www.example.com', 'legacy.other.com'],
  hostnameStatuses: [
    dnsStatus('www.example.com', 'True', 'DNSRecordCreated'),
    dnsStatus('legacy.other.com', 'False', 'NotApplicable'),
  ],
} as HttpProxy;

const gatewayRecord = {
  dnsZoneId: 'example-com',
  type: 'CNAME',
  name: 'www',
  value: 'edge.datum.net.',
  rawData: {},
  managedByGateway: true,
  gatewaySourceName: 'edge-proxy',
};

/** A record the user owns that this proxy protects (matched on hostname + origin). */
const userRecord = {
  dnsZoneId: 'example-com',
  type: 'A',
  name: 'www',
  value: '203.0.113.10',
  rawData: {},
};

function mountPreview({
  zones,
  records,
  proxy: proxyOverride,
}: { zones?: unknown[]; records?: unknown[]; proxy?: HttpProxy } = {}) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  qc.setQueryData(dnsZoneKeys.list(PROJECT, undefined), zones ?? []);
  if (records) qc.setQueryData(dnsRecordKeys.list(PROJECT, 'example-com'), records);

  cy.mount(
    <QueryClientProvider client={qc}>
      <ProxyDeleteDnsPreview projectId={PROJECT} proxy={proxyOverride ?? proxy} />
    </QueryClientProvider>
  );
}

describe('ProxyDeleteDnsPreview', () => {
  it('summarises and lists every hostname without any record data loaded', () => {
    mountPreview();
    cy.get('[data-e2e="dns-preview-summary"]').should(
      'contain.text',
      '1 DNS record will be deleted'
    );
    cy.get('[data-e2e="dns-hostname-list"]').should('contain.text', 'www.example.com');
    cy.get('[data-e2e="dns-hostname-list"]').should('contain.text', 'legacy.other.com');
  });

  it('reads as plain English when nothing will be deleted', () => {
    mountPreview({
      proxy: {
        ...proxy,
        hostnameStatuses: [
          dnsStatus('www.example.com', 'False', 'NotApplicable'),
          dnsStatus('legacy.other.com', 'False', 'NotApplicable'),
        ],
      } as HttpProxy,
    });
    cy.get('[data-e2e="dns-preview-summary"]').should(
      'have.text',
      'No DNS records will be deleted'
    );
  });

  it('explains why a hostname outside Datum DNS contributes no record', () => {
    mountPreview();
    cy.get('[data-e2e="dns-hostname-list"]').should(
      'contain.text',
      'Not managed by Datum DNS — no record to delete'
    );
  });

  it('omits the kept note until records confirm the user owns one', () => {
    mountPreview();
    cy.get('[data-e2e="dns-kept-note"]').should('not.exist');
  });

  it('fills in record type and target once the zone records resolve', () => {
    mountPreview({
      zones: [{ name: 'example-com', domainName: 'example.com' }],
      records: [gatewayRecord],
    });
    cy.get('[data-e2e="dns-hostname-list"]').should(
      'contain.text',
      'Deleted: CNAME → edge.datum.net.'
    );
  });

  it('groups the deleted and kept records under the one hostname they share', () => {
    mountPreview({
      zones: [{ name: 'example-com', domainName: 'example.com' }],
      records: [gatewayRecord, userRecord],
    });
    cy.get('[data-e2e="dns-preview-summary"]').should('contain.text', '1 kept');
    cy.get('[data-e2e="dns-hostname-list"] li')
      .contains('www.example.com')
      .parent()
      .within(() => {
        cy.contains('Deleted: CNAME → edge.datum.net.').should('exist');
        cy.contains('Kept: A → 203.0.113.10').should('exist');
      });
    cy.get('[data-e2e="dns-kept-note"]').should('exist');
  });
});
