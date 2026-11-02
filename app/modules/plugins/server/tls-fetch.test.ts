import { KubeClient, parseKubeconfig, resolveKubeContext } from './kubeconfig';
import { withCaBundle } from './plugin-fetch';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:https';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TLSSocket } from 'node:tls';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

interface Pki {
  ca: string;
  otherCa: string;
  serverCert: string;
  serverKey: string;
  clientCert: string;
  clientKey: string;
  otherClientCert: string;
  otherClientKey: string;
}

function generatePki(dir: string): Pki {
  const openssl = (...args: string[]) => execFileSync('openssl', args, { cwd: dir, stdio: 'pipe' });
  const ecKey = (name: string) =>
    openssl(
      'req',
      '-x509',
      '-newkey',
      'ec',
      '-pkeyopt',
      'ec_paramgen_curve:prime256v1',
      '-nodes',
      '-keyout',
      `${name}.key`,
      '-out',
      `${name}.crt`,
      '-days',
      '2',
      '-subj',
      `/CN=${name}`
    );
  const leaf = (name: string, ca: string, ext: string) => {
    openssl(
      'req',
      '-new',
      '-newkey',
      'ec',
      '-pkeyopt',
      'ec_paramgen_curve:prime256v1',
      '-nodes',
      '-keyout',
      `${name}.key`,
      '-out',
      `${name}.csr`,
      '-subj',
      `/CN=${name}`
    );
    writeFileSync(join(dir, `${name}.ext`), ext);
    openssl(
      'x509',
      '-req',
      '-in',
      `${name}.csr`,
      '-CA',
      `${ca}.crt`,
      '-CAkey',
      `${ca}.key`,
      '-CAcreateserial',
      '-out',
      `${name}.crt`,
      '-days',
      '2',
      '-extfile',
      `${name}.ext`
    );
  };
  ecKey('ca');
  ecKey('other-ca');
  leaf('server', 'ca', 'subjectAltName=IP:127.0.0.1,DNS:localhost\nextendedKeyUsage=serverAuth\n');
  leaf('client', 'ca', 'extendedKeyUsage=clientAuth\n');
  leaf('other-client', 'other-ca', 'extendedKeyUsage=clientAuth\n');
  const read = (file: string) => readFileSync(join(dir, file), 'utf8');
  return {
    ca: read('ca.crt'),
    otherCa: read('other-ca.crt'),
    serverCert: read('server.crt'),
    serverKey: read('server.key'),
    clientCert: read('client.crt'),
    clientKey: read('client.key'),
    otherClientCert: read('other-client.crt'),
    otherClientKey: read('other-client.key'),
  };
}

function listen(server: Server): Promise<string> {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve(`https://127.0.0.1:${(server.address() as AddressInfo).port}`);
    });
  });
}

const b64 = (pem: string) => Buffer.from(pem).toString('base64');

function kubeconfig(server: string, cluster: string, user: string): string {
  return `
apiVersion: v1
kind: Config
current-context: test
clusters:
- name: test-cluster
  cluster:
    server: ${server}
${cluster}
contexts:
- name: test
  context:
    cluster: test-cluster
    user: test-user
users:
- name: test-user
  user:
${user}
`;
}

let dir: string;
let pki: Pki;
let mtlsServer: Server;
let mtlsUrl: string;
const clientErrors: string[] = [];
let plainServer: Server;
let plainUrl: string;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'tls-fetch-'));
  pki = generatePki(dir);

  mtlsServer = createServer(
    {
      key: pki.serverKey,
      cert: pki.serverCert,
      ca: pki.ca,
      requestCert: true,
      rejectUnauthorized: true,
    },
    (req, res) => {
      const peer = (req.socket as TLSSocket).getPeerCertificate();
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ client: peer.subject?.CN ?? null }));
    }
  );
  mtlsServer.on('tlsClientError', (error: NodeJS.ErrnoException) => {
    clientErrors.push(error.code ?? error.message);
  });
  mtlsUrl = await listen(mtlsServer);

  plainServer = createServer({ key: pki.serverKey, cert: pki.serverCert }, (_req, res) => {
    res.end('ok');
  });
  plainUrl = await listen(plainServer);
});

afterAll(() => {
  mtlsServer?.close();
  plainServer?.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('withCaBundle on Node fetch', () => {
  test('trusts an origin signed by the plugin CA bundle', async () => {
    const response = await fetch(plainUrl, withCaBundle({ method: 'GET' }, pki.ca));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('ok');
  });

  test('rejects an origin signed by a different CA', async () => {
    await expect(
      fetch(plainUrl, withCaBundle({ method: 'GET' }, pki.otherCa))
    ).rejects.toMatchObject({ cause: { code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' } });
  });

  test('rejects a private CA origin when no bundle is configured', async () => {
    await expect(fetch(plainUrl, withCaBundle({ method: 'GET' }, undefined))).rejects.toMatchObject(
      { cause: { code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' } }
    );
  });

  test('returns the init unchanged for a blank bundle', () => {
    const init = { method: 'GET' };
    expect(withCaBundle(init, '   ')).toBe(init);
  });
});

describe('KubeClient TLS on Node fetch', () => {
  const caData = () => `    certificate-authority-data: ${b64(pki.ca)}`;

  test('presents the kubeconfig client certificate', async () => {
    const client = new KubeClient(
      resolveKubeContext(
        parseKubeconfig(
          kubeconfig(
            mtlsUrl,
            caData(),
            `    client-certificate-data: ${b64(pki.clientCert)}\n    client-key-data: ${b64(pki.clientKey)}`
          )
        )
      )
    );
    const response = await client.request('/healthz');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ client: 'client' });
  });

  test('fails when the server requires a client certificate and none is configured', async () => {
    const client = new KubeClient(
      resolveKubeContext(parseKubeconfig(kubeconfig(mtlsUrl, caData(), '    token: t')))
    );
    const before = clientErrors.length;
    await expect(client.request('/healthz')).rejects.toMatchObject({
      cause: { code: 'UND_ERR_SOCKET' },
    });
    expect(clientErrors.slice(before)).toHaveLength(1);
  });

  test('fails when the client certificate is signed by a CA the server does not trust', async () => {
    const client = new KubeClient(
      resolveKubeContext(
        parseKubeconfig(
          kubeconfig(
            mtlsUrl,
            caData(),
            `    client-certificate-data: ${b64(pki.otherClientCert)}\n    client-key-data: ${b64(pki.otherClientKey)}`
          )
        )
      )
    );
    const before = clientErrors.length;
    await expect(client.request('/healthz')).rejects.toMatchObject({
      cause: { code: 'UND_ERR_SOCKET' },
    });
    expect(clientErrors.slice(before)).toHaveLength(1);
  });

  test('rejects a server certificate not signed by the kubeconfig CA', async () => {
    const client = new KubeClient(
      resolveKubeContext(
        parseKubeconfig(
          kubeconfig(
            mtlsUrl,
            `    certificate-authority-data: ${b64(pki.otherCa)}`,
            `    client-certificate-data: ${b64(pki.clientCert)}\n    client-key-data: ${b64(pki.clientKey)}`
          )
        )
      )
    );
    await expect(client.request('/healthz')).rejects.toMatchObject({
      cause: { code: 'SELF_SIGNED_CERT_IN_CHAIN' },
    });
  });

  test('rejects an untrusted server when the kubeconfig names no CA', async () => {
    const client = new KubeClient(
      resolveKubeContext(parseKubeconfig(kubeconfig(plainUrl, '', '    token: t')))
    );
    await expect(client.request('/healthz')).rejects.toMatchObject({
      cause: { code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' },
    });
  });

  test('skips verification only when insecure-skip-tls-verify is set', async () => {
    const client = new KubeClient(
      resolveKubeContext(
        parseKubeconfig(kubeconfig(plainUrl, '    insecure-skip-tls-verify: true', '    token: t'))
      )
    );
    const response = await client.request('/healthz');
    expect(response.status).toBe(200);
  });
});
