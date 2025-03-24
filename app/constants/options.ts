import {
  LocationClass,
  LocationProvider,
} from '@/resources/interfaces/location.interface'
import { RuntimeType, StorageType } from '@/resources/interfaces/workload.interface'

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

export const RUNTIME_TYPES = {
  [RuntimeType.CONTAINER]: {
    label: 'Container',
    description: 'A container is a lightweight, portable runtime environment.',
  },
  [RuntimeType.VM]: {
    label: 'Virtual Machine',
    description: 'A virtual machine is a full virtualized operating system.',
  },
}

export const STORAGE_TYPES = {
  [StorageType.FILESYSTEM]: {
    label: 'Filesystem volume',
    description: 'A filesystem volume is a volume that is used to store data.',
  },
  [StorageType.REQUEST]: {
    label: 'Request a volume size',
    description: 'Request a volume with a specific size.',
  },
}
