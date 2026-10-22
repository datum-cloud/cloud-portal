// Installs the shim in ./trust-store.ts before any connection opens.
import { installTrustStore } from './trust-store';

installTrustStore();
