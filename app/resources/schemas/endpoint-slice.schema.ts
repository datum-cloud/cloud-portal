import { metadataSchema, nameSchema } from './metadata.schema'
import {
  EndpointSliceAddressType,
  EndpointSlicePortProtocol,
} from '@/resources/interfaces/endpoint-slice.interface'
import { z } from 'zod'

export const endpointSliceEndpointSchema = z.object({
  addresses: z.array(z.string()).min(1, { message: 'At least one address is required' }),
  conditions: z.object({
    ready: z.boolean(),
    reachable: z.boolean(),
    terminating: z.boolean(),
  }),
})

export const endpointSlicePortSchema = z
  .object({
    appProtocol: z.enum(
      Object.values(EndpointSlicePortProtocol) as [string, ...string[]],
    ),
  })
  .and(nameSchema)

export const endpointSliceSchema = z
  .object({
    resourceVersion: z.string().optional(),
    addressType: z.enum(Object.values(EndpointSliceAddressType) as [string, ...string[]]),
    endpoints: z
      .array(endpointSliceEndpointSchema)
      .min(1, { message: 'At least one endpoint is required' }),
    ports: z
      .array(endpointSlicePortSchema)
      .min(1, { message: 'At least one port is required' }),
  })
  .and(metadataSchema)

export type EndpointSliceSchema = z.infer<typeof endpointSliceSchema>
export type EndpointSlicePortSchema = z.infer<typeof endpointSlicePortSchema>
export type EndpointSliceEndpointSchema = z.infer<typeof endpointSliceEndpointSchema>
