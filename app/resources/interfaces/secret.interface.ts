export interface ISecretControlResponse {
  name?: string
  namespace?: string
  createdAt?: Date
  uid?: string
  resourceVersion?: string
  data?: string[]
  type?: SecretType
  labels?: string[]
  annotations?: string[]
}

export enum SecretType {
  OPAQUE = 'Opaque',
  SERVICE_ACCOUNT_TOKEN = 'kubernetes.io/service-account-token',
  DOCKERCFG = 'kubernetes.io/dockercfg',
  DOCKERCONFIGJSON = 'kubernetes.io/dockerconfigjson',
  BASIC_AUTH = 'kubernetes.io/basic-auth',
  SSH_AUTH = 'kubernetes.io/ssh-auth',
  TLS = 'kubernetes.io/tls',
  BOOTSTRAP_TOKEN = 'bootstrap.kubernetes.io/token',
}
