import { setup } from './harness';
import { pluginE2EConfig } from './plugin-e2e.config';

export default async function globalSetup() {
  await setup(pluginE2EConfig);
}
