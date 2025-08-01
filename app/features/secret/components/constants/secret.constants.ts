import { SecretType } from '@/resources/interfaces/secret.interface';

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
    description: 'A docker config JSON is a secret that is used to store a docker config JSON.',
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
};
