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

/**
 * Extended status response with detailed condition information
 * Used by transformControlPlaneStatus when includeConditionDetails is true
 */
export interface IExtendedControlPlaneStatus extends IControlPlaneStatus {
  // Condition-specific fields (only when includeConditionDetails = true)
  isProgrammed?: boolean;
  programmedReason?: string;
  isAccepted?: boolean;
  acceptedReason?: string;

  // All conditions for advanced usage
  conditions?: Array<{
    type: string;
    status: 'True' | 'False' | 'Unknown';
    reason?: string;
    message?: string;
  }>;
}
