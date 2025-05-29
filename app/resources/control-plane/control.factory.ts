import { createControlPlaneClient } from '@/modules/control-plane/axios-control';
import { Client } from '@hey-api/client-axios';

export const createControlPlaneFactory = (authToken: string): Client => {
  const baseURL = `${process.env.API_URL}/apis/resourcemanager.datumapis.com/v1alpha`;

  const apiClient: Client = createControlPlaneClient({
    baseURL,
    authToken,
  });

  return apiClient;
};

export type ControlPlaneFactory = ReturnType<typeof createControlPlaneFactory>;
