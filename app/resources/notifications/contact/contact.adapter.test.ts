import {
  toContact,
  toContactList,
  toCreateContactPayload,
  toUpdateContactPayload,
} from './contact.adapter';
import { rawMetadata } from '@/test/factories/k8s';
import { describe, expect, it } from 'bun:test';

describe('toContact', () => {
  it('builds displayName from given+family name and maps providers', () => {
    const raw = {
      metadata: rawMetadata({ uid: 'c-1', name: 'contact-1' }),
      spec: {
        email: 'ada@acme.com',
        givenName: 'Ada',
        familyName: 'Lovelace',
        subject: { name: 'user-a' },
      },
      status: { providers: [{ id: 'p1', name: 'Resend', extra: 'ignored' }] },
    };
    const contact = toContact(raw as never);

    expect(contact.displayName).toBe('Ada Lovelace');
    expect(contact.email).toBe('ada@acme.com');
    expect(contact.subjectName).toBe('user-a');
    expect(contact.providers).toEqual([{ id: 'p1', name: 'Resend' }]);
  });

  it('falls back to email, then metadata.name, then "Contact" for displayName', () => {
    expect(
      toContact({ metadata: { name: 'n' }, spec: { email: 'e@x.com' } } as never).displayName
    ).toBe('e@x.com');
    expect(toContact({ metadata: { name: 'just-name' }, spec: {} } as never).displayName).toBe(
      'just-name'
    );
    expect(toContact({ metadata: {}, spec: {} } as never).displayName).toBe('Contact');
  });
});

describe('toContactList', () => {
  it('reads the cursor from metadata.continue when no explicit cursor is given', () => {
    const list = toContactList({
      items: [{ metadata: { uid: 'a' }, spec: {} }],
      metadata: { continue: 'c' },
    } as never);
    expect(list.items[0].uid).toBe('a');
    expect(list.nextCursor).toBe('c');
    expect(list.hasMore).toBe(true);
  });

  it('prefers an explicit nextCursor argument', () => {
    const list = toContactList({ items: [], metadata: { continue: 'c' } } as never, 'explicit');
    expect(list.nextCursor).toBe('explicit');
  });
});

describe('toCreateContactPayload', () => {
  it('includes optional name fields and subject only when provided', () => {
    const full = toCreateContactPayload({
      name: 'contact-1',
      email: 'ada@acme.com',
      givenName: 'Ada',
      familyName: 'Lovelace',
      subjectName: 'user-a',
    } as never);
    expect(full.spec).toEqual({
      email: 'ada@acme.com',
      givenName: 'Ada',
      familyName: 'Lovelace',
      subject: { apiGroup: 'iam.miloapis.com', kind: 'User', name: 'user-a' },
    });

    const minimal = toCreateContactPayload({ name: 'c', email: 'e@x.com' } as never);
    expect(minimal.spec).toEqual({ email: 'e@x.com' });
  });
});

describe('toUpdateContactPayload', () => {
  it('patches resourceVersion plus only the provided spec fields', () => {
    expect(toUpdateContactPayload({ resourceVersion: '7', email: 'new@x.com' } as never)).toEqual({
      metadata: { resourceVersion: '7' },
      spec: { email: 'new@x.com' },
    });
  });

  it('omits spec when nothing but resourceVersion is provided', () => {
    expect(toUpdateContactPayload({ resourceVersion: '7' } as never)).toEqual({
      metadata: { resourceVersion: '7' },
    });
  });
});
