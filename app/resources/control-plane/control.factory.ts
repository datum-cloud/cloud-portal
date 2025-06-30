import { createControlPlaneClient } from '@/modules/control-plane/axios-control';
import { Client } from '@hey-api/client-axios';

/**
 * Creates a control plane client factory with the provided base URL
 * @param authToken - Authentication token
 * @param baseURL - Base URL for the API
 * @returns Client instance
 */
export const createControlPlaneFactory = (authToken: string, baseURL: string): Client => {
  const apiClient: Client = createControlPlaneClient({
    baseURL,
    authToken,
  });

  return apiClient;
};

export type ControlPlaneFactory = ReturnType<typeof createControlPlaneFactory>;
