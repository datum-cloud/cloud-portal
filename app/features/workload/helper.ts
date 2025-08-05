import {
  ContainerEnvType,
  IWorkloadControlResponse,
  RuntimeType,
  StorageType,
} from '@/resources/interfaces/workload.interface';
import { MetadataSchema } from '@/resources/schemas/metadata.schema';
import {
  NetworkFieldSchema,
  PlacementFieldSchema,
  RuntimeEnvSchema,
  RuntimeSchema,
  StorageFieldSchema,
} from '@/resources/schemas/workload.schema';
import { convertObjectToLabels } from '@/utils/data';
import { filter, find, flatMap, get, has, map } from 'es-toolkit/compat';

const mappingSpecToForm = (value: IWorkloadControlResponse) => {
  const { spec, ...rest } = value;

  // Extract relevant sections from the spec
  const placementsSpec = get(spec, 'placements', []);
  const runtimeSpec = get(spec, 'template.spec.runtime', {});
  const volumesSpec = get(spec, 'template.spec.volumes', []);
  const networkInterfaces = get(spec, 'template.spec.networkInterfaces', []);

  // Determine if this is a VM workload
  const isVm = has(runtimeSpec, 'virtualMachine');

  // Find boot storage and extract boot image information
  const bootStorage = find(volumesSpec, (volume) => volume.name === 'boot');
  const bootImage = get(bootStorage, 'disk.template.spec.populator.image.name', '');

  // ==========================================
  // Map API spec format to form schema format
  // ==========================================

  // 1. Metadata mapping
  const metadata: MetadataSchema = {
    name: rest?.name ?? '',
    labels: convertObjectToLabels(rest?.labels ?? {}),
    annotations: convertObjectToLabels(rest?.annotations ?? {}),
  };

  // 2. Runtime configuration mapping
  const runtime: RuntimeSchema = {
    instanceType: (runtimeSpec as any)?.resources?.instanceType ?? '',
    runtimeType: isVm ? RuntimeType.VM : RuntimeType.CONTAINER,
    // Only include VM-specific configuration if this is a VM workload
    virtualMachine: isVm
      ? {
          sshKey: spec?.template?.metadata?.annotations?.['compute.datumapis.com/ssh-keys'] ?? '',
          bootImage: bootImage,
          ports: (runtimeSpec as any)?.virtualMachine?.ports ?? [],
        }
      : undefined,
    containers: !isVm
      ? (runtimeSpec as any)?.sandbox?.containers.map((container: any) => ({
          name: container.name,
          image: container.image,
          ports: container?.ports ?? [],
          envs: (container?.env ?? []).map((env: any) => {
            const payload = {
              name: env.name,
              type: ContainerEnvType.TEXT,
            };

            if (has(env, 'value') && env.value) {
              Object.assign(payload, {
                type: ContainerEnvType.TEXT,
                value: env.value,
              });
            } else if (has(env, 'valueFrom.secretKeyRef')) {
              const secret = get(env, 'valueFrom.secretKeyRef', {});
              Object.assign(payload, {
                type: ContainerEnvType.SECRET,
                refName: secret.name,
                key: secret.key,
              });
            } else if (has(env, 'valueFrom.configMapKeyRef')) {
              const configMap: any = get(env, 'valueFrom.configMapKeyRef', {});
              Object.assign(payload, {
                type: ContainerEnvType.CONFIG_MAP,
                refName: configMap.name,
                key: configMap.key,
              });
            }

            return payload;
          }) as RuntimeEnvSchema[],
        }))
      : undefined,
  };

  // 3. Network configuration mapping
  // Extract network interfaces and their IP families
  const networks: NetworkFieldSchema[] = map(networkInterfaces, (networkInterface) => ({
    name: networkInterface?.network?.name ?? '',
    ipFamilies: flatMap(networkInterface.networkPolicy?.ingress ?? [], (ingress) =>
      flatMap(ingress.from ?? [], (from) =>
        // Determine IP family based on CIDR
        from.ipBlock?.cidr === '0.0.0.0/0' ? ['IPv4'] : ['IPv6']
      )
    ),
  }));

  // 4. Storage configuration mapping
  // Filter out boot volume as it's handled separately in VM configuration
  const storages: StorageFieldSchema[] = map(
    filter(volumesSpec, (volume) => volume.name !== 'boot'),
    (volume) => ({
      name: volume.name ?? '',
      type: StorageType.FILESYSTEM,
      // Convert storage size from string (e.g., "10Gi") to number
      size:
        Number(
          String(get(volume, 'disk.template.spec.resources.requests.storage', '0')).replace(
            'Gi',
            ''
          )
        ) || 0,
    })
  );

  // 5. Placement configuration mapping
  const placements: PlacementFieldSchema[] = map(placementsSpec, (placement) => ({
    name: placement.name ?? '',
    cityCode: placement.cityCodes?.[0] ?? '',
    minimumReplicas: placement.scaleSettings?.minReplicas ?? 1,
  }));

  return {
    uid: value.uid,
    createdAt: value.createdAt,
    metadata,
    runtime,
    networks,
    storages,
    placements,
  };
};

export const WorkloadHelper = {
  mappingSpecToForm,
};
