import type { ComDatumapisComputeV1AlphaWorkload } from '@/modules/control-plane/compute';
import { z } from 'zod';

/**
 * Input schema + API payload builder for the "Deploy Workload" form.
 *
 * Scope is intentionally minimal — only capabilities deployable today. The
 * builder makes a few fixed assumptions pending richer configuration UI:
 *   - the single placement is always named `default`
 *   - the single container is always named `app`
 *   - the network interface defaults to the project `default` network
 */
export const createWorkloadInputSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(63, 'Name must be at most 63 characters')
    .regex(
      /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/,
      'Must be lowercase alphanumeric or "-", and start/end with an alphanumeric character'
    ),
  image: z.string().min(1, 'Container image is required'),
  instanceType: z.string().default('datumcloud/d1-standard-2'),
  port: z.coerce.number().int().min(1).max(65535).optional(),
  protocol: z.enum(['TCP', 'UDP']).default('TCP'),
  env: z
    .array(
      z.object({
        name: z.string().min(1),
        value: z.string(),
      })
    )
    .default([]),
  cities: z.array(z.string()).min(1, 'Select at least one region'),
  minReplicas: z.coerce.number().int().min(1),
});

export type CreateWorkloadInput = z.infer<typeof createWorkloadInputSchema>;

/**
 * Maps the deploy-workload form input to the compute Workload API payload.
 *
 * Assumptions (pending richer config): the placement is named `default`, the
 * container is named `app`, and the network interface defaults to the project
 * `default` network.
 */
export function buildWorkloadResource(
  input: CreateWorkloadInput
): ComDatumapisComputeV1AlphaWorkload {
  return {
    apiVersion: 'compute.datumapis.com/v1alpha',
    kind: 'Workload',
    metadata: { name: input.name },
    spec: {
      placements: [
        {
          name: 'default',
          cityCodes: input.cities,
          scaleSettings: { minReplicas: input.minReplicas },
        },
      ],
      template: {
        // Propagated to instances created from this template — matches the
        // `app` label the CLI (`datumctl-compute`) stamps on workloads.
        metadata: { labels: { app: input.name } },
        spec: {
          // Defaults to the project 'default' network — REQUIRED field.
          networkInterfaces: [{ network: { name: 'default' } }],
          runtime: {
            resources: { instanceType: input.instanceType },
            sandbox: {
              containers: [
                {
                  name: 'app',
                  image: input.image,
                  ...(input.port
                    ? {
                        ports: [
                          {
                            name: `port-${input.port}`,
                            port: input.port,
                            protocol: input.protocol,
                          },
                        ],
                      }
                    : {}),
                  ...(input.env.length
                    ? { env: input.env.map((e) => ({ name: e.name, value: e.value })) }
                    : {}),
                },
              ],
            },
          },
        },
      },
    },
  };
}
