export enum ControlPlaneStatus {
  Success = 'success',
  Error = 'error',
  Pending = 'pending',
}

export interface IControlPlaneStatus {
  isReady: ControlPlaneStatus
  message: string
  // For Parsing any additional fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}
