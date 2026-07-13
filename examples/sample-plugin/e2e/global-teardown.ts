import { teardown } from './harness';

export default async function globalTeardown() {
  await teardown();
}
