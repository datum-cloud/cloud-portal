import {
  ControlPlaneStatus,
  IControlPlaneStatus,
} from '@/resources/interfaces/control-plane.interface';

export function transformControlPlaneStatus(status: any): IControlPlaneStatus {
  if (!status) return { status: ControlPlaneStatus.Pending, message: '' };

  const { conditions, ...rest } = status;
  if (status && (conditions ?? []).length > 0) {
    const condition = conditions?.[0];
    return {
      status:
        condition?.status === 'True' ? ControlPlaneStatus.Success : ControlPlaneStatus.Pending,
      message: condition?.message ?? '',
      ...rest,
    };
  }

  return {
    status: ControlPlaneStatus.Pending,
    message: 'Resource is being provisioned...',
  };
}
