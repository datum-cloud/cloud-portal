import { PermissionGate, type PermissionGateProps } from './PermissionGate';
import { type ComponentType } from 'react';

type GateConfig = Omit<PermissionGateProps, 'children'>;

export function withPermission<P extends object>(Component: ComponentType<P>, config: GateConfig) {
  return function PermissionWrapped(props: P) {
    return (
      <PermissionGate {...config}>
        <Component {...props} />
      </PermissionGate>
    );
  };
}
