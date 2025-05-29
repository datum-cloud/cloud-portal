import { ILabel } from './label.interface';

export interface ILocationControlResponse {
  name?: string;
  displayName?: string;
  class?: LocationClass;
  createdAt?: Date;
  uid?: string;
  resourceVersion?: string;
  // TODO: for now this is just for GCP, but we will need to add more providers
  provider?: {
    [key in 'gcp']: IGCPProvider;
  };
  cityCode?: string;
  namespace?: string;
  labels?: ILabel;
}

// Provider Interfaces
export interface IGCPProvider {
  projectId: string;
  region: string;
  zone: string;
}

// Location Enums
export enum LocationProvider {
  GCP = 'gcp',
}

export enum LocationClass {
  SELF_MANAGED = 'self-managed',
  DATUM_MANAGED = 'datum-managed',
}
