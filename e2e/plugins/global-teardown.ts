/**
 * Playwright global teardown: stop every server started in global-setup and run
 * any registered teardown commands (e.g. `task devenv:down`). Best-effort and
 * idempotent — safe even if setup failed partway through.
 */
import { stopAll } from './lib/server-manager';

export default async function globalTeardown() {
  await stopAll();
}
