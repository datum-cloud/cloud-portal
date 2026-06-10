import {
  toCreateSecretPayload,
  toSecret,
  toSecretList,
  toUpdateSecretPayload,
} from './secret.adapter';
import { toBase64 } from '@/utils/helpers/text.helper';
import { rawMetadata } from '@/test/factories/k8s';
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
});

describe('toCreateSecretPayload', () => {
  it('base64-encodes plaintext values but leaves already-encoded values intact', () => {
    const alreadyEncoded = toBase64('encoded-value');
    const payload = toCreateSecretPayload({
      name: 'api-keys',
      type: 'Opaque',
      labels: ['env:prod'],
      annotations: ['owner:team-a'],
      variables: [
        { key: 'PLAIN', value: 'hello' },
        { key: 'ENCODED', value: alreadyEncoded },
      ],
    } as never);

    expect(payload.kind).toBe('Secret');
    expect(payload.apiVersion).toBe('v1');
    expect(payload.metadata.name).toBe('api-keys');
    expect(payload.metadata.labels).toEqual({ env: 'prod' });
    expect(payload.metadata.annotations).toEqual({ owner: 'team-a' });
    expect(payload.type).toBe('Opaque');
    expect(payload.data.PLAIN).toBe(toBase64('hello'));
    expect(payload.data.ENCODED).toBe(alreadyEncoded);
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
