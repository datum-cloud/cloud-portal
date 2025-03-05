export enum ControlPlaneStatus {
  Success = 'success',
  Error = 'error',
  Pending = 'pending',
}

export interface IControlPlaneStatus {
  isReady: ControlPlaneStatus
  message: string
}
