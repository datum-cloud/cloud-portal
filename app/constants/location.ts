import {
  LocationClass,
  LocationProvider,
} from '@/resources/interfaces/location.interface'

export const LOCATION_PROVIDERS = {
  [LocationProvider.GCP]: {
    label: 'Google Cloud Platform',
    icon: '/images/providers/gcp.svg',
  },
}

export const LOCATION_CLASSES = {
  [LocationClass.SELF_MANAGED]: {
    label: 'Self Managed',
    description:
      'Full control over infrastructure with self-managed control plane components. Requires more operational effort.',
  },
  [LocationClass.DATUM_MANAGED]: {
    label: 'Datum Managed',
    description:
      'Managed control plane with reduced operational overhead. Datum handles maintenance and updates automatically.',
  },
}
