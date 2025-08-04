import {
  ContainerEnvType,
  RuntimeType,
  StorageType,
} from '@/resources/interfaces/workload.interface';

export const BOOT_IMAGES = ['datumcloud/ubuntu-2204-lts'];

export const RUNTIME_TYPES = {
  [RuntimeType.CONTAINER]: {
    label: 'Container',
    description: 'A container is a lightweight, portable runtime environment.',
  },
  [RuntimeType.VM]: {
    label: 'Virtual Machine',
    description: 'A virtual machine is a full virtualized operating system.',
  },
};

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
};

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
};
