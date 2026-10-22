/**
 * Child process for the trust-store end-to-end tests. It runs with a temporary
 * cwd so the repo's bunfig.toml preloads stay out of this process; the mode
 * decides which shim call, if any, runs before the connections open.
 */
import { installTrustStore } from '../trust-store';
import https from 'node:https';

const [url, mode] = process.argv.slice(2);

if (!url || !mode) {
  console.error('usage: trust-store-child.ts <url> <mode>');
  process.exit(2);
}

let status: string | null = null;

switch (mode) {
  case 'baseline':
    break;
  case 'shim-test-ca':
    status = installTrustStore({
      isDistrusted: (subject) => subject.includes('Trust Store Test CA'),
    }).status;
    break;
  case 'shim-emsign':
    status = installTrustStore().status;
    break;
  case 'shim-throw':
    status = installTrustStore({
      isDistrusted: () => {
        throw new Error('boom');
      },
    }).status;
    break;
  default:
    console.error(`unknown mode: ${mode}`);
    process.exit(2);
}

function fetchSucceeded(target: string): Promise<boolean> {
  return fetch(target).then(
    async (response) => {
      await response.text();
      return response.ok;
    },
    () => false
  );
}

function httpsSucceeded(target: string): Promise<boolean> {
  return new Promise((resolve) => {
    const request = https.get(target, (response) => {
      response.resume();
      response.on('end', () => resolve(response.statusCode === 200));
      response.on('error', () => resolve(false));
    });
    request.on('error', () => resolve(false));
    request.setTimeout(5000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

const fetchOk = await fetchSucceeded(url);
const httpsOk = await httpsSucceeded(url);

process.stdout.write(`${JSON.stringify({ status, fetch: fetchOk, https: httpsOk })}\n`);
process.exit(0);
