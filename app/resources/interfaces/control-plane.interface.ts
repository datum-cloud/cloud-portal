export enum ControlPlaneStatus {
  Success = 'success',
  Error = 'error',
  Pending = 'pending',
}

export interface IControlPlaneStatus {
  status: ControlPlaneStatus;
  message: string;
  // For Parsing any additional fields

  [key: string]: any;
}
