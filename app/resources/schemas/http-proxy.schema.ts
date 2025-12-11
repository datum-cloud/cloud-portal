import { nameSchema } from '@/resources/schemas/metadata.schema';
import { createHostnameSchema } from '@/utils/helpers/validation.helper';
import { z } from 'zod';

export const httpProxyHostnameSchema = z.object({
  hostnames: z.array(createHostnameSchema('Hostname')).optional(),
});

export const httpProxySchema = z
  .object({
    endpoint: z.string({ error: 'Endpoint is required' }).refine(
      (value) => {
        try {
          const url = new URL(value);
          // Must have http:// or https:// protocol
          return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
          return false;
        }
      },
      { message: 'Endpoint must be a valid URL with HTTP/HTTPS protocol' }
    ),
  })
  .and(httpProxyHostnameSchema)
  .and(nameSchema);

export type HttpProxySchema = z.infer<typeof httpProxySchema>;
export type HttpProxyHostnameSchema = z.infer<typeof httpProxyHostnameSchema>;
