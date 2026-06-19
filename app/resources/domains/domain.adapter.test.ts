import {
  toCreateDomainPayload,
  toDomain,
  toDomainList,
  toRefreshRegistrationPayload,
  toUpdateDomainPayload,
} from './domain.adapter';
import { rawMetadata } from '@/test/factories/k8s';
import { describe, expect, it } from 'bun:test';

describe('toDomain', () => {
  it('maps metadata + spec fields and coerces createdAt to a Date', () => {
    const raw = {
      metadata: rawMetadata({
        uid: 'd-1',
        name: 'example-com',
        namespace: 'proj-1',
        resourceVersion: '7',
        annotations: { 'kubernetes.io/description': 'primary domain' },
      }),
      spec: {
        domainName: 'example.com',
        desiredRegistrationRefreshAttempt: '2024-05-01T00:00:00Z',
      },
      status: { phase: 'Active' },
    };
    const domain = toDomain(raw as never);

    expect(domain.uid).toBe('d-1');
    expect(domain.name).toBe('example-com');
    expect(domain.namespace).toBe('proj-1');
    expect(domain.description).toBe('primary domain');
    expect(domain.resourceVersion).toBe('7');
    expect(domain.domainName).toBe('example.com');
    expect(domain.desiredRegistrationRefreshAttempt).toBe('2024-05-01T00:00:00Z');
    expect(domain.status).toEqual({ phase: 'Active' });
    expect(domain.createdAt).toBeInstanceOf(Date);
    expect((domain.createdAt as Date).toISOString()).toBe('2024-01-01T00:00:00.000Z');
  });

  it('falls back to empty strings and a fresh Date when fields are absent', () => {
    const domain = toDomain({} as never);

    expect(domain.uid).toBe('');
    expect(domain.name).toBe('');
    expect(domain.namespace).toBe('');
    expect(domain.domainName).toBe('');
    expect(domain.desiredRegistrationRefreshAttempt).toBe('');
    expect(domain.description).toBeUndefined();
    expect(domain.createdAt).toBeInstanceOf(Date);
  });
});

describe('toDomainList', () => {
  it('maps items and surfaces pagination from the cursor', () => {
    const items = [
      { metadata: { uid: 'a', name: 'a' }, spec: { domainName: 'a.com' } },
      { metadata: { uid: 'b', name: 'b' }, spec: { domainName: 'b.com' } },
    ];
    const list = toDomainList(items as never, 'cursor-2');

    expect(list.items.map((d) => d.domainName)).toEqual(['a.com', 'b.com']);
    expect(list.nextCursor).toBe('cursor-2');
    expect(list.hasMore).toBe(true);
  });

  it('returns a null cursor and hasMore=false without a token', () => {
    const list = toDomainList([] as never);
    expect(list.nextCursor).toBeNull();
    expect(list.hasMore).toBe(false);
  });
});

describe('toCreateDomainPayload', () => {
  it('uses the provided name verbatim', () => {
    const payload = toCreateDomainPayload({
      name: 'my-domain',
      domainName: 'example.com',
    } as never);

    expect(payload.kind).toBe('Domain');
    expect(payload.apiVersion).toBe('networking.datumapis.com/v1alpha');
    expect(payload.metadata?.name).toBe('my-domain');
    expect(payload.spec?.domainName).toBe('example.com');
  });

  it('derives a kebab-cased name from the domain when none is provided', () => {
    const payload = toCreateDomainPayload({ domainName: 'My Example.com' } as never);
    // generateId appends randomness, so assert the stable slug prefix only.
    expect(payload.metadata?.name).toMatch(/^my-example-com/);
  });
});

describe('toUpdateDomainPayload', () => {
  it('wraps the domain name in a Domain spec patch', () => {
    expect(toUpdateDomainPayload('next.example.com')).toEqual({
      kind: 'Domain',
      apiVersion: 'networking.datumapis.com/v1alpha',
      spec: { domainName: 'next.example.com' },
    });
  });
});

describe('toRefreshRegistrationPayload', () => {
  it('stamps an ISO timestamp for the desired refresh attempt', () => {
    const payload = toRefreshRegistrationPayload();

    expect(payload.kind).toBe('Domain');
    expect(payload.spec.desiredRegistrationRefreshAttempt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    );
  });
});
