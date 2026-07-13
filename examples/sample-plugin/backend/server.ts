/**
 * Sample plugin backend — a tiny stand-in for a service team's own API.
 *
 * The portal NEVER lets the browser talk to this server directly. Calls arrive
 * through the portal's declared-backend proxy:
 *   browser → /api/plugins/sample/proxy/api/<path>  (portal, :3000)
 *           → http://localhost:7778/<path>          (this server)
 * The portal injects `Authorization: Bearer <user token>` because the CR's
 * proxy alias declares `authorization: UserToken`. This server therefore:
 *   - needs NO CORS (it's never hit cross-origin from a browser), and
 *   - echoes whether it SAW an Authorization header — to visibly prove the
 *     UserToken mediation — but never validates, logs, or stores the token.
 *
 * Run with:  bun run backend/server.ts   (or `task plugin:backend`)
 */

const PORT = Number(process.env.PLUGIN_BACKEND_PORT ?? 7778);

type InstanceStatus = 'Running' | 'Restarting' | 'Stopped';

interface Instance {
  id: string;
  name: string;
  status: InstanceStatus;
  region: string;
  specs: { cpu: number; memoryGiB: number; disk: string };
  createdAt: string;
}

// In-memory fixture data. Deterministic so e2e can assert on it.
const instances = new Map<string, Instance>(
  (
    [
      {
        id: 'inst-001',
        name: 'web-1',
        status: 'Running',
        region: 'us-east-1',
        specs: { cpu: 2, memoryGiB: 4, disk: '40Gi' },
      },
      {
        id: 'inst-002',
        name: 'web-2',
        status: 'Running',
        region: 'us-east-1',
        specs: { cpu: 2, memoryGiB: 4, disk: '40Gi' },
      },
      {
        id: 'inst-003',
        name: 'worker-1',
        status: 'Running',
        region: 'us-west-2',
        specs: { cpu: 4, memoryGiB: 16, disk: '100Gi' },
      },
      {
        id: 'inst-004',
        name: 'db-primary',
        status: 'Stopped',
        region: 'eu-west-1',
        specs: { cpu: 8, memoryGiB: 32, disk: '500Gi' },
      },
    ] satisfies Omit<Instance, 'createdAt'>[]
  ).map((i) => [i.id, { ...i, createdAt: '2026-06-01T12:00:00Z' }])
);

/** How long a restarted instance stays in Restarting before flipping back. */
const RESTART_MS = Number(process.env.PLUGIN_BACKEND_RESTART_MS ?? 3000);

function json(body: unknown, init: ResponseInit & { authSeen?: boolean } = {}): Response {
  const { authSeen, ...rest } = init;
  const headers = new Headers(rest.headers);
  headers.set('Content-Type', 'application/json');
  // Demonstrates the proxy forwarded (or not) the user's bearer token.
  if (authSeen !== undefined) headers.set('X-Authorization-Seen', authSeen ? 'yes' : 'no');
  return new Response(JSON.stringify(body), { ...rest, headers });
}

/** Envelope with a `meta` block so the UI can surface proxy/mediation facts. */
function withMeta<T>(
  data: T,
  authSeen: boolean
): { data: T; meta: { authorizationForwarded: boolean } } {
  return { data, meta: { authorizationForwarded: authSeen } };
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const { pathname } = url;
    // Presence only — never inspect the value.
    const authSeen = req.headers.has('authorization');

    // GET /instances
    if (req.method === 'GET' && pathname === '/instances') {
      return json(withMeta({ items: [...instances.values()] }, authSeen), { authSeen });
    }

    // GET|POST /instances/:id[/restart]
    const match = pathname.match(/^\/instances\/([^/]+)(\/restart)?$/);
    if (match) {
      const [, id, isRestart] = match;
      const instance = instances.get(id);
      if (!instance) return json({ error: 'Instance not found', id }, { status: 404, authSeen });

      if (req.method === 'GET' && !isRestart) {
        return json(withMeta(instance, authSeen), { authSeen });
      }

      // POST /instances/:id/restart → Running/Stopped → Restarting → Running
      if (req.method === 'POST' && isRestart) {
        instance.status = 'Restarting';
        setTimeout(() => {
          const current = instances.get(id);
          if (current && current.status === 'Restarting') current.status = 'Running';
        }, RESTART_MS);
        return json(withMeta(instance, authSeen), { status: 202, authSeen });
      }
    }

    return json({ error: 'Not found', path: pathname }, { status: 404, authSeen });
  },
});

// eslint-disable-next-line no-console
console.log(`[sample-plugin backend] listening on http://localhost:${server.port}`);
