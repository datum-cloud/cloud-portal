import { nameSchema } from './general.schema'
import { RuntimeType, StorageType } from '@/resources/interfaces/workload.interface'
import { z } from 'zod'

// Metadata Section
export const metadataSchema = z
  .object({
    labels: z.array(z.string()).optional(),
    annotations: z.array(z.string()).optional(),
  })
  .and(nameSchema)

// Runtime Section
export const runtimeVMSchema = z.object({
  bootImage: z.string({ required_error: 'Boot image is required for VM.' }).optional(),
  sshKey: z
    .string({ required_error: 'SSH key is required for VM.' })
    .regex(
      /^([a-zA-Z0-9_.-]+):(?:ssh-rsa AAAA[0-9A-Za-z+/]+[=]{0,3}( [^@]+@[^@]+)?$|ssh-ed25519 AAAA[0-9A-Za-z+/]+[=]{0,3}( [^@]+@[^@]+)?$|ssh-dss AAAA[0-9A-Za-z+/]+[=]{0,3}( [^@]+@[^@]+)?$|ecdsa-sha2-nistp(?:256|384|521) AAAA[0-9A-Za-z+/]+[=]{0,3}( [^@]+@[^@]+)?$)/,
      {
        message:
          'Invalid SSH key format. Must be in the format "username:ssh-key" with a valid SSH public key (RSA, ED25519, DSA, or ECDSA).',
      },
    ),
})

export const runtimeContainerSchema = z
  .object({
    image: z.string({ required_error: 'Image is required.' }),
  })
  .merge(nameSchema)

export const runtimeSchema = z.object({
  instanceType: z.string({ required_error: 'Instance type is required.' }),
  runtimeType: z.enum(Object.values(RuntimeType) as [string, ...string[]], {
    required_error: 'Runtime type is required.',
  }),
  virtualMachine: runtimeVMSchema.optional(),
  containers: z.array(runtimeContainerSchema).optional(),
})

export const networkFieldSchema = z.object({
  name: z.string({ required_error: 'Network is required.' }),
  ipFamilies: z
    .array(z.string({ required_error: 'IP family selection is required.' }))
    .min(1, { message: 'At least one IP family must be selected.' }),
})

export const networksSchema = z.object({
  networks: z.array(networkFieldSchema).min(1, {
    message: 'At least one network must be configured.',
  }),
})

// Storage Section
export const storageFieldSchema = z
  .object({
    name: z
      .string({ required_error: 'Name is required.' })
      .min(1, { message: 'Name is required.' })
      .max(63, { message: 'Name must be at most 63 characters long.' })
      .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, {
        message:
          'Name must contain only lowercase alphanumeric characters or hyphens, start with an alphanumeric character, and end with an alphanumeric character',
      }),
    type: z.enum(Object.values(StorageType) as [string, ...string[]], {
      required_error: 'Storage type is required.',
    }),
    bootImage: z.string().optional(),
    size: z.coerce
      .number({ required_error: 'Size is required.' })
      .min(10, {
        message: 'Size must be at least 10Gi.',
      })
      .transform((val) => Number(val))
      .optional(),
  })
  .refine(
    (data) => {
      if (data?.type === StorageType.FILESYSTEM) {
        return !!data?.size
      }
      return true
    },
    {
      message: 'Size is required for filesystem storage type',
      path: ['size'],
    },
  )
export const storagesSchema = z
  .object({
    storages: z.array(storageFieldSchema),
  })
  .superRefine((data, ctx) => {
    // Check for duplicate storage names
    const usedNames = new Set<string>()

    data.storages.forEach((storage, index) => {
      const name = storage.name?.trim()

      if (name) {
        if (usedNames.has(name)) {
          // If name already exists, add validation error
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Name "${name}" is already used`,
            path: ['storages', index, 'name'],
          })
        } else {
          // Track this name as used
          usedNames.add(name)
        }
      }
    })
  })

// Placements
export const placementFieldSchema = z
  .object({
    cityCode: z.string({ required_error: 'City code is required.' }),
    minimumReplicas: z.coerce
      .number({ required_error: 'Minimum replicas is required.' })
      .min(1, {
        message: 'Minimum replicas must be at least 1.',
      })
      .transform((val) => Number(val)),
  })
  .and(nameSchema)

export const placementsSchema = z
  .object({
    placements: z.array(placementFieldSchema).min(1, {
      message: 'At least one placement must be configured.',
    }),
  })
  .superRefine((data, ctx) => {
    // Check for duplicate storage names
    const usedNames = new Set<string>()

    data.placements.forEach((placement, index) => {
      const name = placement.name?.trim()

      if (name) {
        if (usedNames.has(name)) {
          // If name already exists, add validation error
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Name "${name}" is already used`,
            path: ['placements', index, 'name'],
          })
        } else {
          // Track this name as used
          usedNames.add(name)
        }
      }
    })
  })

export const newWorkloadSchema = z
  .object({
    metadata: metadataSchema,
    runtime: runtimeSchema,
  })
  .and(networksSchema)
  .and(storagesSchema)
  .and(placementsSchema)

export const updateWorkloadSchema = z
  .object({
    resourceVersion: z.string({ required_error: 'Resource version is required.' }),
  })
  .and(runtimeSchema)
  .and(metadataSchema)
  .and(networksSchema)
  .and(storagesSchema)
  .and(placementsSchema)

export type MetadataSchema = z.infer<typeof metadataSchema>
export type RuntimeSchema = z.infer<typeof runtimeSchema>
export type RuntimeVMSchema = z.infer<typeof runtimeVMSchema>
export type RuntimeContainerSchema = z.infer<typeof runtimeContainerSchema>
export type NetworksSchema = z.infer<typeof networksSchema>
export type NetworkFieldSchema = z.infer<typeof networkFieldSchema>
export type StoragesSchema = z.infer<typeof storagesSchema>
export type StorageFieldSchema = z.infer<typeof storageFieldSchema>
export type PlacementsSchema = z.infer<typeof placementsSchema>
export type PlacementFieldSchema = z.infer<typeof placementFieldSchema>

export type NewWorkloadSchema = z.infer<typeof newWorkloadSchema>
export type UpdateWorkloadSchema = z.infer<typeof updateWorkloadSchema>
