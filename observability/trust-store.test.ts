/// <reference types="bun-types/test" />
import {
  installTrustStore,
  isEmSign,
  partitionRoots,
  reportTrustStoreFailure,
  resetTrustStore,
  withTrustedFetch,
  withTrustedWebSocket,
} from './trust-store';
import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { X509Certificate } from 'node:crypto';
import tls from 'node:tls';

type CapturedInit = {
  tls?: { ca?: unknown; [key: string]: unknown };
  [key: string]: unknown;
};

const calls: Array<[unknown, CapturedInit]> = [];
const fake = Object.assign(
  (input: unknown, init?: CapturedInit) => {
    calls.push([input, init ?? {}]);
    return Promise.resolve(new Response('ok'));
  },
  { preconnect: () => {} }
) as unknown as typeof fetch;

class FakeWS {
  static args: Array<[unknown, CapturedInit]> = [];

  constructor(...args: [unknown, CapturedInit]) {
    FakeWS.args.push(args);
  }
}

type WebSocketCtor = new (
  url: string | URL,
  protocolsOrOptions?: string | string[] | CapturedInit
) => FakeWS;

const trustedWebSocket = (): WebSocketCtor =>
  withTrustedWebSocket(FakeWS as unknown as typeof WebSocket, ['CA']) as unknown as WebSocketCtor;

let savedFetch: typeof fetch;
let savedWebSocket: typeof WebSocket;
let savedCa: string[];

beforeEach(() => {
  calls.length = 0;
  FakeWS.args.length = 0;
  savedFetch = globalThis.fetch;
  savedWebSocket = globalThis.WebSocket;
  savedCa = tls.getCACertificates('default');
  resetTrustStore();
});

afterEach(() => {
  globalThis.fetch = savedFetch;
  globalThis.WebSocket = savedWebSocket;
  tls.setDefaultCACertificates(savedCa);
  resetTrustStore();
});

describe('partitionRoots', () => {
  it("drops the four emSign roots from Bun's bundled list", () => {
    const { kept, dropped } = partitionRoots(tls.getCACertificates('bundled'), isEmSign);
    expect(dropped.sort()).toEqual([
      'CN=emSign ECC Root CA - C3',
      'CN=emSign ECC Root CA - G3',
      'CN=emSign Root CA - C1',
      'CN=emSign Root CA - G1',
    ]);
    expect(kept).toHaveLength(tls.getCACertificates('bundled').length - 4);
  });
});

describe('withTrustedFetch', () => {
  it('adds ca when the caller sets no tls', async () => {
    await withTrustedFetch(fake, ['CA'])('https://x.test');
    expect(calls[0][1].tls).toEqual({ ca: ['CA'] });
  });

  it('keeps a caller ca untouched', async () => {
    await withTrustedFetch(fake, ['CA'])('https://x.test', {
      tls: { ca: 'MINE' },
    } as unknown as RequestInit);
    expect(calls[0][1].tls).toEqual({ ca: 'MINE' });
  });

  it('merges ca into caller tls that has no ca', async () => {
    await withTrustedFetch(fake, ['CA'])('https://x.test', {
      tls: { rejectUnauthorized: false, cert: 'C', key: 'K' },
    } as unknown as RequestInit);
    expect(calls[0][1].tls).toEqual({
      rejectUnauthorized: false,
      cert: 'C',
      key: 'K',
      ca: ['CA'],
    });
  });

  it('adds ca for a Request with no init', async () => {
    const req = new Request('https://x.test');
    await withTrustedFetch(fake, ['CA'])(req);
    expect(calls[0][0]).toBe(req);
    expect(calls[0][1].tls).toEqual({ ca: ['CA'] });
  });

  it('keeps fetch.preconnect', () => {
    const trusted = withTrustedFetch(fake, ['CA']) as typeof fetch & {
      preconnect?: unknown;
    };
    expect(typeof trusted.preconnect).toBe('function');
  });
});

describe('withTrustedWebSocket', () => {
  it('passes ca in options and stays an instance of the base', () => {
    const W = trustedWebSocket();
    const ws = new W('wss://x.test');
    expect(ws).toBeInstanceOf(FakeWS);
    expect(FakeWS.args.at(-1)).toEqual(['wss://x.test', { tls: { ca: ['CA'] } }]);
  });

  it('turns protocols into options.protocols', () => {
    new (trustedWebSocket())('wss://x.test', ['a', 'b']);
    expect(FakeWS.args.at(-1)).toEqual([
      'wss://x.test',
      { protocols: ['a', 'b'], tls: { ca: ['CA'] } },
    ]);
  });

  it('keeps a caller ca untouched', () => {
    new (trustedWebSocket())('wss://x.test', { tls: { ca: 'MINE' } });
    expect(FakeWS.args.at(-1)?.[1].tls).toEqual({ ca: 'MINE' });
  });
});

describe('installTrustStore', () => {
  it('returns not-needed and leaves fetch alone when nothing matches', () => {
    const before = globalThis.fetch;
    expect(installTrustStore({ isDistrusted: () => false })).toEqual({ status: 'not-needed' });
    expect(globalThis.fetch).toBe(before);
  });

  it('returns failed, logs the prefix and does not throw when filtering throws', () => {
    const errorLog = spyOn(console, 'error').mockImplementation(() => {});
    try {
      const result = installTrustStore({
        isDistrusted: () => {
          throw new Error('boom');
        },
      });
      expect(result.status).toBe('failed');
      expect(String(errorLog.mock.calls[0]?.[0])).toContain('[trust-store]');
    } finally {
      errorLog.mockRestore();
    }
  });

  it('drops emSign from the default list when applied', () => {
    tls.setDefaultCACertificates(tls.getCACertificates('bundled')); // undo the test preload
    expect(installTrustStore().status).toBe('applied');
    expect(
      tls.getCACertificates('default').some((p) => isEmSign(new X509Certificate(p).subject))
    ).toBe(false);
  });

  it('returns the first result on a second call without wrapping again', () => {
    const first = installTrustStore();
    const wrapped = globalThis.fetch;
    expect(installTrustStore()).toBe(first);
    expect(globalThis.fetch).toBe(wrapped);
  });
});

describe('reportTrustStoreFailure', () => {
  it('captures a failed result with the trust-store tag', () => {
    const capture = mock(() => {});
    const err = new Error('boom');
    expect(reportTrustStoreFailure(capture, { status: 'failed', error: err })).toBe(true);
    expect(capture).toHaveBeenCalledWith(err, { tags: { component: 'trust-store' } });
  });

  it('captures nothing for applied or missing results', () => {
    const capture = mock(() => {});
    expect(reportTrustStoreFailure(capture, { status: 'applied', dropped: [], kept: 1 })).toBe(
      false
    );
    expect(reportTrustStoreFailure(capture, undefined)).toBe(false);
    expect(capture).not.toHaveBeenCalled();
  });
});
