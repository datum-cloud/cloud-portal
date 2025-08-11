import { metadataSchema, nameSchema } from './metadata.schema';
import {
  HTTPFilterType,
  HTTPPathMatchType,
  HTTPPathRewriteType,
} from '@/resources/interfaces/http-route.interface';
import { createHostnameSchema } from '@/utils/validation';
import { z } from 'zod';

// ----- Match Section -----
// Schema for HTTP path match
export const httpPathMatchSchema = z.object({
  type: z.enum(Object.values(HTTPPathMatchType) as [string, ...string[]], {
    required_error: 'Path match type is required',
  }),
  value: z
    .string({ required_error: 'Path value is required' })
    .min(1, { message: 'Path value is required' }),
});

// Schema for matches
export const httpRouteMatchSchema = z.object({
  path: httpPathMatchSchema.optional(),
});

// ----- End Match Section -----

// ----- Backend Reference Section -----
export const httpRouteBackendRefSchema = z
  .object({
    port: z
      .number({ required_error: 'Port is required' })
      .int()
      .min(1, { message: 'Port must be at least 1' })
      .max(65535, { message: 'Port must be at most 65535' }),
  })
  .and(nameSchema);

// ----- End Backend Reference Section -----

// ----- Filter Section -----

export const httpPathRewriteSchema = z.object({
  type: z.enum(Object.values(HTTPPathRewriteType) as [string, ...string[]]),
  value: z
    .string({ required_error: 'Path value is required' })
    .min(1, { message: 'Path value is required' }),
});
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
      })
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
      })
    )
    .optional(),
  remove: z.array(z.string()).optional(),
});

// Schema for request redirect filter
export const httpRequestRedirectSchema = z.object({
  hostname: z.string().optional(),
  path: httpPathRewriteSchema.optional(),
  port: z.number().int().min(1).max(65535).optional(),
});

// Schema for URL rewrite filter
export const httpURLRewriteSchema = z.object({
  hostname: createHostnameSchema('Hostname'),
  path: httpPathRewriteSchema.optional(),
});

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
      if (data.type === HTTPFilterType.URL_REWRITE) {
        return !!data.urlRewrite;
      }
      /* if (data.type === HTTPFilterType.REQUEST_HEADER_MODIFIER) {
        return !!data.requestHeaderModifier
      } else if (data.type === HTTPFilterType.REQUEST_REDIRECT) {
        return !!data.requestRedirect
      } else if (data.type === HTTPFilterType.URL_REWRITE) {
        return !!data.urlRewrite
      } */
      return false;
    },
    {
      message: 'Filter configuration must match the selected filter type',
      path: ['type'],
    }
  );

// ----- End Filter Section -----

// ----- Rule Section -----
// Schema for rules
export const httpRouteRuleSchema = z.object({
  matches: z.array(httpRouteMatchSchema).min(1, { message: 'At least one match is required' }),
  backendRefs: z
    .array(httpRouteBackendRefSchema)
    .min(1, { message: 'At least one backend reference is required' }),
  filters: z.array(httpRouteFilterSchema).optional(),
});

// ----- End Rule Section -----

// ----- Main HTTP Route Schema -----
// Main HTTP Route schema
export const httpRouteSchema = z
  .object({
    resourceVersion: z.string().optional(),
    parentRefs: z
      .array(z.string({ required_error: 'Gateway reference is required' }))
      .min(1, { message: 'At least one Gateway reference is required' }),
    rules: z.array(httpRouteRuleSchema).min(1, { message: 'At least one rule is required' }),
  })
  .and(metadataSchema);

// ----- End Main HTTP Route Schema -----

// Type exports
// ----- Main HTTP Route Schema -----
export type HttpRouteSchema = z.infer<typeof httpRouteSchema>;

// ----- Rule Section -----
export type HttpRouteRuleSchema = z.infer<typeof httpRouteRuleSchema>;

// ----- Match Section -----
export type HttpRouteMatchSchema = z.infer<typeof httpRouteMatchSchema>;
export type HttpPathMatchSchema = z.infer<typeof httpPathMatchSchema>;

// ----- Backend Reference Section -----
export type HttpRouteBackendRefSchema = z.infer<typeof httpRouteBackendRefSchema>;

// ----- Filter Section -----
export type HttpRouteFilterSchema = z.infer<typeof httpRouteFilterSchema>;
export type HttpPathRewriteSchema = z.infer<typeof httpPathRewriteSchema>;
export type HttpURLRewriteSchema = z.infer<typeof httpURLRewriteSchema>;
export type HttpHeaderModifierSchema = z.infer<typeof httpRequestHeaderModifierSchema>;
export type HttpRedirectSchema = z.infer<typeof httpRequestRedirectSchema>;
