import { kindToHref } from './kindToHref';
import type { SearchHit } from '@/resources/search';
import { describe, expect, it } from 'bun:test';

const hit = (kind: string, name = 'x', tenantName = 'p'): SearchHit => ({
  uid: 'u',
  name,
  apiVersion: '',
  kind,
  relevanceScore: 0,
  tenant: { name: tenantName, type: 'Project' },
});

describe('kindToHref', () => {
  it('returns Project URL for Project kind', () => {
    const href = kindToHref(hit('Project', 'acme-prod', 'acme-co'));
    expect(href).not.toBeNull();
    expect(href).toContain('acme-prod');
  });

  it('returns Organization URL for Organization kind', () => {
    const href = kindToHref(hit('Organization', 'acme-co'));
    expect(href).not.toBeNull();
    expect(href).toContain('acme-co');
  });

  it('returns Domain URL for Domain kind', () => {
    const href = kindToHref(hit('Domain', 'acme.com', 'acme-prod'));
    expect(href).not.toBeNull();
    expect(href).toContain('acme.com');
  });

  it('returns DNSZone URL for DNSZone kind', () => {
    const href = kindToHref(hit('DNSZone', 'acme-zone', 'acme-prod'));
    expect(href).not.toBeNull();
    expect(href).toContain('acme-zone');
  });

  it('returns Group URL for Group kind', () => {
    // Group is under org, so tenant should be the org name
    const href = kindToHref(hit('Group', 'admins', 'acme-co'));
    expect(href).not.toBeNull();
    expect(href).toContain('admins');
  });

  it('returns HTTPProxy URL for HTTPProxy kind (all-caps HTTP, matches API casing)', () => {
    const href = kindToHref(hit('HTTPProxy', 'jinja-resource', 'acme-prod'));
    expect(href).not.toBeNull();
    expect(href).toContain('jinja-resource');
    expect(href).toContain('edge');
  });

  it('returns ExportPolicy URL for ExportPolicy kind', () => {
    const href = kindToHref(hit('ExportPolicy', 'metrics-policy', 'acme-prod'));
    expect(href).not.toBeNull();
    expect(href).toContain('metrics-policy');
    expect(href).toContain('export-policies');
  });

  it('returns null for unsupported kind', () => {
    expect(kindToHref(hit('UnknownKind'))).toBeNull();
  });

  it('returns null for kinds not yet wired (Pascal-case HttpProxy, Secret, ServiceAccount, DnsRecordSet)', () => {
    // HttpProxy (Pascal) intentionally returns null — the API uses all-caps
    // HTTPProxy, so the Pascal form is not a real kind that comes back from
    // the server. Keeping it in the null list documents the casing contract.
    for (const kind of ['HttpProxy', 'Secret', 'ServiceAccount', 'DnsRecordSet']) {
      expect(kindToHref(hit(kind, 'x', 'acme-prod'))).toBeNull();
    }
  });
});
