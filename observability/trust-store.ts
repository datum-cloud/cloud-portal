/**
 * Bun 1.4.2 and 1.4.3 trust the emSign roots (datum-cloud/infra#7423). Bun's
 * `fetch` and `WebSocket` ignore `setDefaultCACertificates`, so this module
 * also wraps them and passes the filtered roots as `tls.ca`. Delete this file
 * once production runs Bun 1.4.4 or later.
 */
import { X509Certificate } from 'node:crypto';
import tls from 'node:tls';

export const LOG_PREFIX = '[trust-store]';

export const isEmSign = (subject: string): boolean => /emSign/.test(subject);

type TlsOptions = {
  ca?: unknown;
  [key: string]: unknown;
};

type FetchInit = RequestInit & { tls?: TlsOptions };

type WebSocketInit = {
  protocols?: string | string[];
  tls?: TlsOptions;
  [key: string]: unknown;
};

function commonName(subject: string): string {
  return subject.split('\n').find((line) => line.startsWith('CN=')) ?? subject;
}

export function partitionRoots(
  pems: readonly string[],
  isDistrusted: (subject: string) => boolean
): { kept: string[]; dropped: string[] } {
  const kept: string[] = [];
  const dropped: string[] = [];

  for (const pem of pems) {
    const subject = new X509Certificate(pem).subject;
    if (isDistrusted(subject)) {
      dropped.push(commonName(subject));
    } else {
      kept.push(pem);
    }
  }

  return { kept, dropped };
}

export function withTrustedFetch(fetchImpl: typeof fetch, ca: string[]): typeof fetch {
  const wrapped = (input: Parameters<typeof fetch>[0], init?: FetchInit): Promise<Response> => {
    const nextInit = init?.tls?.ca === undefined ? { ...init, tls: { ...init?.tls, ca } } : init;
    return fetchImpl(input, nextInit);
  };

  return Object.assign(wrapped, fetchImpl) as typeof fetch;
}

export function withTrustedWebSocket(Base: typeof WebSocket, ca: string[]): typeof WebSocket {
  class TrustedWebSocket extends Base {
    constructor(url: string | URL, protocolsOrOptions?: string | string[] | WebSocketInit) {
      const options: WebSocketInit =
        typeof protocolsOrOptions === 'string' || Array.isArray(protocolsOrOptions)
          ? { protocols: protocolsOrOptions }
          : { ...protocolsOrOptions };

      if (options.tls?.ca === undefined) {
        options.tls = { ...options.tls, ca };
      }

      super(url, options as unknown as string | string[]);
    }
  }

  return TrustedWebSocket;
}

export type TrustStoreResult =
  | { status: 'applied'; dropped: string[]; kept: number }
  | { status: 'not-needed' }
  | { status: 'failed'; error: unknown };

let trustStoreResult: TrustStoreResult | undefined;

export function installTrustStore(options?: {
  isDistrusted?: (subject: string) => boolean;
}): TrustStoreResult {
  if (trustStoreResult) {
    return trustStoreResult;
  }

  try {
    const isDistrusted = options?.isDistrusted ?? isEmSign;
    const { kept, dropped } = partitionRoots(tls.getCACertificates('default'), isDistrusted);

    if (dropped.length === 0) {
      console.log(`${LOG_PREFIX} Bun's built-in roots carry no distrusted root; shim not needed`);
      trustStoreResult = { status: 'not-needed' };
      return trustStoreResult;
    }

    tls.setDefaultCACertificates(kept);
    globalThis.fetch = withTrustedFetch(globalThis.fetch, kept);
    globalThis.WebSocket = withTrustedWebSocket(globalThis.WebSocket, kept);

    console.log(`${LOG_PREFIX} Distrusted ${dropped.length} roots: ${dropped.join(', ')}`);
    trustStoreResult = { status: 'applied', dropped, kept: kept.length };
    return trustStoreResult;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to apply; Bun's built-in roots stay trusted:`, error);
    trustStoreResult = { status: 'failed', error };
    return trustStoreResult;
  }
}

export function getTrustStoreResult(): TrustStoreResult | undefined {
  return trustStoreResult;
}

export function resetTrustStore(): void {
  trustStoreResult = undefined;
}

export function reportTrustStoreFailure(
  capture: (error: unknown, hint?: unknown) => void,
  result: TrustStoreResult | undefined = getTrustStoreResult()
): boolean {
  if (result?.status === 'failed') {
    capture(result.error, { tags: { component: 'trust-store' } });
    return true;
  }

  return false;
}
