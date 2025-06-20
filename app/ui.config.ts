import { List, LucideIcon } from 'lucide-react';

interface IUIConfig {
  name: string;
  resource: {
    group: string;
    version: string;
    kind: string;
  };
  menu: {
    label: string;
    icon: LucideIcon;
    parent?: string;
  };
}

export const uiConfig: IUIConfig[] = [
  {
    name: 'network',
    resource: {
      group: 'networking.datumapis.com',
      version: 'v1alpha',
      kind: 'Network',
    },
    menu: {
      label: 'Networks',
      icon: List,
    },
  },
  {
    name: 'gateway-class',
    resource: {
      group: 'gateway.networking.k8s.io',
      version: 'v1',
      kind: 'GatewayClass',
    },
    menu: {
      label: 'Gateway Classes',
      icon: List,
      parent: 'network',
    },
  },
  {
    name: 'gateway',
    resource: {
      group: 'gateway.networking.k8s.io',
      version: 'v1',
      kind: 'Gateway',
    },
    menu: {
      label: 'Gateways',
      icon: List,
      parent: 'network',
    },
  },
  {
    name: 'deployment',
    resource: {
      group: 'compute.datumapis.com',
      version: 'v1alpha',
      kind: 'WorkloadDeployment',
    },
    menu: {
      label: 'Deployments',
      icon: List,
    },
  },
  {
    name: 'workload',
    resource: {
      group: 'compute.datumapis.com',
      version: 'v1alpha',
      kind: 'Workload',
    },
    menu: {
      label: 'Workloads',
      icon: List,
    },
  },
  {
    name: 'workload',
    resource: {
      group: 'compute.datumapis.com',
      version: 'v1alpha',
      kind: 'Workload',
    },
    menu: {
      label: 'Workloads',
      icon: List,
    },
  },
];
