import {
  toCreateSecretPayload,
  toSecret,
  toSecretData,
  toSecretList,
  toUpdateSecretPayload,
} from './secret.adapter';
import { rawMetadata } from '@/test/factories/k8s';
import { toBase64 } from '@/utils/helpers/text.helper';
import { describe, expect, it } from 'bun:test';

describe('toSecret', () => {
  it('exposes only the data keys (never the values) and maps metadata', () => {
    const raw = {
      metadata: rawMetadata({
        uid: 's-1',
        name: 'db-creds',
        namespace: 'proj-1',
        resourceVersion: '9',
        labels: { app: 'api' },
        annotations: { team: 'platform' },
      }),
      data: { username: 'YWRtaW4=', password: 'cGFzcw==' },
      type: 'Opaque',
    };
    const secret = toSecret(raw as never);

    expect(secret.uid).toBe('s-1');
    expect(secret.name).toBe('db-creds');
    expect(secret.namespace).toBe('proj-1');
    expect(secret.resourceVersion).toBe('9');
    expect(secret.data).toEqual(['username', 'password']);
    expect(secret.type).toBe('Opaque');
    expect(secret.labels).toEqual({ app: 'api' });
    expect(secret.annotations).toEqual({ team: 'platform' });
  });

  it('defaults data/labels/annotations to empty collections when absent', () => {
    const secret = toSecret({ metadata: { name: 'x' } } as never);
    expect(secret.data).toEqual([]);
    expect(secret.labels).toEqual({});
    expect(secret.annotations).toEqual({});
  });
});

describe('toSecretList', () => {
  it('maps items and surfaces pagination from the cursor', () => {
    const list = toSecretList(
      [{ metadata: { uid: 'a', name: 'a' }, data: { k: 'dg==' } }] as never,
      'cur'
    );
    expect(list.items[0].data).toEqual(['k']);
    expect(list.nextCursor).toBe('cur');
    expect(list.hasMore).toBe(true);
  });

  it('drops terminating secrets', () => {
    const list = toSecretList([
      { metadata: { uid: 'a', name: 'a' } },
      { metadata: { uid: 'b', name: 'b', deletionTimestamp: '2026-10-05T00:00:00Z' } },
    ] as never);
    expect(list.items.map((secret) => secret.name)).toEqual(['a']);
  });
});

// Mirrors what Kubernetes does on read: base64 → bytes → UTF-8 text.
const decode = (encoded: string): string =>
  new TextDecoder().decode(Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0)));

// Each of these is also valid base64, which is what the old guess tripped on.
const ROUND_TRIP_VALUES: Array<[label: string, value: string]> = [
  ['a 64-char hex token', 'a3f1c9e07b4d2a8f6e5c1b0d9a7f3e2c4b6d8a0f1e3c5b7d9f2a4c6e8b0d1f3a'],
  ['a 32-char hex key', '0123456789abcdef0123456789abcdef'],
  ['the word password', 'password'],
  ['admin123', 'admin123'],
  ['an empty string', ''],
  ['a value with a newline', 'line-one\nline-two'],
  ['a value that is already base64 text', 'aGVsbG8='],
  ['non-ASCII text', 'pässwörd-✓'],
];

describe('toSecretData', () => {
  it.each(ROUND_TRIP_VALUES)('always encodes %s so it decodes to the exact input', (_, value) => {
    const data = toSecretData([{ key: 'K', value }]);
    expect(decode(data.K)).toBe(value);
  });

  it('encodes a value even when it already looks like base64', () => {
    expect(toSecretData([{ key: 'K', value: 'password' }]).K).toBe(btoa('password'));
  });

  it('returns an empty map for no variables', () => {
    expect(toSecretData([])).toEqual({});
  });

  it('throws when encoding fails instead of writing an empty value', () => {
    const realBtoa = globalThis.btoa;
    globalThis.btoa = () => {
      throw new Error('encoder unavailable');
    };
    try {
      expect(() => toSecretData([{ key: 'K', value: 'hello' }])).toThrow('encoder unavailable');
    } finally {
      globalThis.btoa = realBtoa;
    }
  });
});

describe('toBase64', () => {
  it('encodes the UTF-8 bytes, not UTF-16 code units', () => {
    expect(toBase64('✓')).toBe('4pyT');
  });
});

describe('toCreateSecretPayload', () => {
  it('maps metadata and base64-encodes every value', () => {
    const payload = toCreateSecretPayload({
      name: 'api-keys',
      type: 'Opaque',
      labels: ['env:prod'],
      annotations: ['owner:team-a'],
      variables: [
        { key: 'PLAIN', value: 'hello' },
        { key: 'LOOKS_ENCODED', value: 'aGVsbG8=' },
      ],
    } as never);

    expect(payload.kind).toBe('Secret');
    expect(payload.apiVersion).toBe('v1');
    expect(payload.metadata.name).toBe('api-keys');
    expect(payload.metadata.labels).toEqual({ env: 'prod' });
    expect(payload.metadata.annotations).toEqual({ owner: 'team-a' });
    expect(payload.type).toBe('Opaque');
    expect(payload.data.PLAIN).toBe(toBase64('hello'));
    expect(decode(payload.data.LOOKS_ENCODED)).toBe('aGVsbG8=');
  });

  it('produces empty label/annotation/data maps when optional inputs are omitted', () => {
    const payload = toCreateSecretPayload({ name: 's', type: 'Opaque' } as never);
    expect(payload.metadata.labels).toEqual({});
    expect(payload.metadata.annotations).toEqual({});
    expect(payload.data).toEqual({});
  });
});

describe('toUpdateSecretPayload', () => {
  it('includes data and metadata only when provided', () => {
    expect(toUpdateSecretPayload({ data: { k: 'dg==' } })).toEqual({
      kind: 'Secret',
      apiVersion: 'v1',
      data: { k: 'dg==' },
    });

    const full = toUpdateSecretPayload({ data: { k: 'dg==' }, metadata: { labels: { a: 'b' } } });
    expect(full.metadata).toEqual({ labels: { a: 'b' } });
  });

  it('emits only the kind/apiVersion envelope when nothing changes', () => {
    expect(toUpdateSecretPayload({})).toEqual({ kind: 'Secret', apiVersion: 'v1' });
  });
});
