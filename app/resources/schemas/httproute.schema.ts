import { metadataSchema, nameSchema } from './metadata.schema'
import {
  HTTPFilterType,
  HTTPPathMatchType,
  HTTPPathRewriteType,
} from '@/resources/interfaces/http-route.interface'
import { z } from 'zod'

// ----- Match Section -----
// Schema for HTTP path match
export const httpPathMatchSchema = z.object({
  type: z.enum(Object.values(HTTPPathMatchType) as [string, ...string[]], {
    required_error: 'Path match type is required',
  }),
  value: z
    .string({ required_error: 'Path value is required' })
    .min(1, { message: 'Path value is required' }),
})

// Schema for matches
export const httpRouteMatchSchema = z.object({
  path: httpPathMatchSchema.optional(),
})

// ----- End Match Section -----

// ----- Backend Reference Section -----
export const httpBackendRefSchema = z
  .object({
    port: z
      .number({ required_error: 'Port is required' })
      .int()
      .min(1, { message: 'Port must be at least 1' })
      .max(65535, { message: 'Port must be at most 65535' }),
  })
  .and(nameSchema)

// ----- End Backend Reference Section -----

// ----- Filter Section -----

export const httpPathRewriteSchema = z
  .object({
    type: z.enum(Object.values(HTTPPathRewriteType) as [string, ...string[]]),
    replaceFullPath: z.string({ required_error: 'Replace path is required' }).optional(),
    replacePrefixMatch: z
      .string({ required_error: 'Replace path is required' })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === HTTPPathRewriteType.REPLACE_FULL_PATH && !data.replaceFullPath) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Replace path is required',
        path: ['replaceFullPath'],
      })
    } else if (
      data.type === HTTPPathRewriteType.REPLACE_PREFIX_MATCH &&
      !data.replacePrefixMatch
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Replace path is required',
        path: ['replacePrefixMatch'],
      })
    }
  })
// Schema for request header modifier filter
export const httpRequestHeaderModifierSchema = z.object({
  set: z
    .array(
      z.object({
        name: z
          .string({ required_error: 'Name is required' })
          .min(1, { message: 'Name is required' })
          .max(256, { message: 'Name must be at most 256 characters' })
          .regex(/^[A-Za-z0-9!#$%&'*+\-.^_`|~]+$/, {
            message: 'Name must be a valid HTTP header name',
          }),
        value: z.string().min(1, { message: 'Value is required' }),
      }),
    )
    .optional(),
  add: z
    .array(
      z.object({
        name: z
          .string({ required_error: 'Name is required' })
          .min(1, { message: 'Name is required' })
          .max(256, { message: 'Name must be at most 256 characters' })
          .regex(/^[A-Za-z0-9!#$%&'*+\-.^_`|~]+$/, {
            message: 'Name must be a valid HTTP header name',
          }),
        value: z.string().min(1, { message: 'Value is required' }),
      }),
    )
    .optional(),
  remove: z.array(z.string()).optional(),
})

// Schema for request redirect filter
export const httpRequestRedirectSchema = z.object({
  hostname: z.string().optional(),
  path: httpPathRewriteSchema.optional(),
  port: z.number().int().min(1).max(65535).optional(),
})

// Schema for URL rewrite filter
export const httpURLRewriteSchema = z.object({
  hostname: z
    .string({ required_error: 'Hostname is required' })
    .refine(
      (val) =>
        !val ||
        /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
          val,
        ),
      {
        message:
          "Hostname must follow RFC 1123 format with optional wildcard prefix (e.g., '*.example.com')",
      },
    )
    .refine((val) => !val || !val.includes('*') || val.startsWith('*.'), {
      message: 'Wildcard label (*) must appear by itself as the first label',
    })
    .refine((val) => !val || !/^\d+\.\d+\.\d+\.\d+$/.test(val), {
      message: 'IP addresses are not allowed as hostnames',
    }),
  path: httpPathRewriteSchema.optional(),
})

// Schema for filters
export const httpRouteFilterSchema = z
  .object({
    type: z.enum(Object.values(HTTPFilterType) as [string, ...string[]], {
      required_error: 'Filter type is required',
    }),
    requestHeaderModifier: httpRequestHeaderModifierSchema.optional(),
    requestRedirect: httpRequestRedirectSchema.optional(),
    urlRewrite: httpURLRewriteSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.type === HTTPFilterType.REQUEST_HEADER_MODIFIER) {
        return !!data.requestHeaderModifier
      } else if (data.type === HTTPFilterType.REQUEST_REDIRECT) {
        return !!data.requestRedirect
      } else if (data.type === HTTPFilterType.URL_REWRITE) {
        return !!data.urlRewrite
      }
      return false
    },
    {
      message: 'Filter configuration must match the selected filter type',
      path: ['type'],
    },
  )

// ----- End Filter Section -----

// ----- Rule Section -----
// Schema for rules
export const httpRouteRuleSchema = z.object({
  matches: z
    .array(httpRouteMatchSchema)
    .min(1, { message: 'At least one match is required' }),
  backendRefs: z
    .array(httpBackendRefSchema)
    .min(1, { message: 'At least one backend reference is required' }),
  filters: z.array(httpRouteFilterSchema).optional(),
})

// ----- End Rule Section -----

// ----- Main HTTP Route Schema -----
// Main HTTP Route schema
export const httpRouteSchema = z
  .object({
    resourceVersion: z.string().optional(),
    parentRefs: z
      .array(z.string({ required_error: 'Gateway reference is required' }))
      .min(1, { message: 'At least one Gateway reference is required' }),
    rules: z
      .array(httpRouteRuleSchema)
      .min(1, { message: 'At least one rule is required' }),
  })
  .and(metadataSchema)

// ----- End Main HTTP Route Schema -----

// Type exports
// ----- Main HTTP Route Schema -----
export type HttpRouteSchema = z.infer<typeof httpRouteSchema>

// ----- Rule Section -----
export type HttpRouteRuleSchema = z.infer<typeof httpRouteRuleSchema>

// ----- Match Section -----
export type HttpRouteMatchSchema = z.infer<typeof httpRouteMatchSchema>
export type HttpPathMatchSchema = z.infer<typeof httpPathMatchSchema>

// ----- Backend Reference Section -----
export type HttpBackendRefSchema = z.infer<typeof httpBackendRefSchema>

// ----- Filter Section -----
export type HttpRouteFilterSchema = z.infer<typeof httpRouteFilterSchema>
export type HttpPathRewriteSchema = z.infer<typeof httpPathRewriteSchema>
export type RequestHeaderModifierSchema = z.infer<typeof httpRequestHeaderModifierSchema>
export type RequestRedirectSchema = z.infer<typeof httpRequestRedirectSchema>
export type URLRewriteSchema = z.infer<typeof httpURLRewriteSchema>
