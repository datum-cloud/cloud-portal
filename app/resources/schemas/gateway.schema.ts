import { metadataSchema, nameSchema } from './metadata.schema'
import {
  GatewayAllowedRoutes,
  GatewayProtocol,
  GatewayTlsMode,
} from '@/resources/interfaces/gateway.interface'
import { z } from 'zod'

export const gatewayTlsSchema = z.object({
  mode: z.enum(Object.values(GatewayTlsMode) as [string, ...string[]], {
    required_error: 'TLS mode is required.',
  }),
})

export const gatewayListenerFieldSchema = z
  .object({
    protocol: z.enum(Object.values(GatewayProtocol) as [string, ...string[]], {
      required_error: 'Protocol is required.',
    }),
    tlsConfiguration: gatewayTlsSchema.optional(),
    allowedRoutes: z.enum(Object.values(GatewayAllowedRoutes) as [string, ...string[]], {
      required_error: 'Allowed routes is required.',
    }),
    // matchLabels: z.array(z.string()).optional(),
  })
  .and(nameSchema)
  .refine(
    (data) => {
      return (
        data.protocol !== GatewayProtocol.HTTPS || data.tlsConfiguration !== undefined
      )
    },
    {
      message: 'TLS configuration is required when protocol is HTTPS',
      path: ['tlsConfiguration'],
    },
  )
// Enable match labels when allowed routes is selector available
/* .refine(
    (data) => {
      return (
        data.allowedRoutes !== GatewayAllowedRoutes.SELECTOR ||
        (data.matchLabels && data.matchLabels.length > 0)
      )
    },
    {
      message: 'Label selector is required when "Selector" is chosen',
      path: ['matchLabels'],
    },
  ) */

export const gatewayListenerSchema = z.object({
  listeners: z.array(gatewayListenerFieldSchema).min(1, {
    message: 'At least one listener is required',
  }),
})

export const gatewaySchema = z
  .object({
    resourceVersion: z.string().optional(),
  })
  .and(gatewayListenerSchema)
  .and(metadataSchema)
  .superRefine((data, ctx) => {
    const usedNames = new Set<string>()
    data?.listeners?.forEach((listener, index) => {
      const name = listener.name?.trim()
      if (name) {
        if (usedNames.has(name)) {
          // If name already exists, add validation error
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Name "${name}" is already used`,
            path: ['listeners', index, 'name'],
          })
        } else {
          // Track this name as used
          usedNames.add(name)
        }
      }
    })
  })

export type GatewaySchema = z.infer<typeof gatewaySchema>

export type GatewayListenerSchema = z.infer<typeof gatewayListenerSchema>
export type GatewayListenerFieldSchema = z.infer<typeof gatewayListenerFieldSchema>

export type GatewayTlsSchema = z.infer<typeof gatewayTlsSchema>
