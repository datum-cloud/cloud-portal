import {
  ExportPolicyAuthenticationType,
  ExportPolicySinkType,
  ExportPolicySourceType,
} from '@/resources/interfaces/export-policy.interface'
import {
  LocationClass,
  LocationProvider,
} from '@/resources/interfaces/location.interface'
import { SecretType } from '@/resources/interfaces/secret.interface'
import {
  ContainerEnvType,
  RuntimeType,
  StorageType,
} from '@/resources/interfaces/workload.interface'

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
  [StorageType.BOOT]: {
    label: 'Boot volume',
    description: 'A boot volume is a volume that is used to store the boot image.',
  },
}

export const ENV_TYPES = {
  [ContainerEnvType.TEXT]: {
    label: 'Text',
    description: 'A text is a value that is used to store a text.',
  },
  [ContainerEnvType.SECRET]: {
    label: 'Secret',
    description: 'A secret is a value that is used to store a secret.',
  },
  [ContainerEnvType.CONFIG_MAP]: {
    label: 'Config Map',
    description: 'A config map is a value that is used to store a config map.',
  },
}

export const POLICY_SOURCE_TYPES = {
  [ExportPolicySourceType.METRICS]: {
    label: 'Metrics',
    description: 'A metrics source is a source that is used to export metrics.',
  },
}

export const POLICY_SINK_TYPES = {
  [ExportPolicySinkType.PROMETHEUS]: {
    label: 'Prometheus Remote Write',
    description:
      'A sink used for exporting telemetry data to a Prometheus Remote Write endpoint as part of a Kubernetes export policy.',
  },
}

export const SECRET_TYPES = {
  [SecretType.OPAQUE]: {
    label: 'Opaque',
    description: 'An opaque secret is a secret that is used to store data.',
  },
  [SecretType.SERVICE_ACCOUNT_TOKEN]: {
    label: 'Service Account Token',
    description:
      'A service account token is a secret that is used to store a service account token.',
  },
  [SecretType.DOCKERCFG]: {
    label: 'Docker Config',
    description: 'A docker config is a secret that is used to store a docker config.',
  },
  [SecretType.DOCKERCONFIGJSON]: {
    label: 'Docker Config JSON',
    description:
      'A docker config JSON is a secret that is used to store a docker config JSON.',
  },
  [SecretType.BASIC_AUTH]: {
    label: 'Basic Auth',
    description: 'A basic auth is a secret that is used to store a basic auth.',
  },
  [SecretType.SSH_AUTH]: {
    label: 'SSH Auth',
    description: 'An ssh auth is a secret that is used to store an ssh auth.',
  },
  [SecretType.TLS]: {
    label: 'TLS',
    description: 'A TLS is a secret that is used to store a TLS.',
  },
  [SecretType.BOOTSTRAP_TOKEN]: {
    label: 'Bootstrap Token',
    description: 'A bootstrap token is a secret that is used to store a bootstrap token.',
  },
}

export const SINK_AUTH_TYPES = {
  [ExportPolicyAuthenticationType.BASIC_AUTH]: {
    label: 'Basic Auth',
    description: 'A basic auth is a secret that is used to store a basic auth.',
  },
}
