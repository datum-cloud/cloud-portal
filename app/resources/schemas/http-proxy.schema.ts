import { nameSchema } from '@/resources/schemas/metadata.schema';
import { z } from 'zod';

export const httpProxySchema = z
  .object({
    endpoint: z.string({ required_error: 'Endpoint is required' }).refine(
      (value) => {
        try {
          // Must have http:// or https:// protocol
          if (!value.startsWith('http://') && !value.startsWith('https://')) {
            return false;
          }

          // Parse as URL to validate format
          const url = new URL(value);

          // Check if it's an IP address (not allowed)
          const ipPattern = /^\d{1,3}(\.\d{1,3}){3}$/;
          if (ipPattern.test(url.hostname)) {
            return false;
          }

          // Ensure no path component (pathname should be just '/')
          if (url.pathname !== '/' && url.pathname !== '') {
            return false;
          }

          return true;
        } catch {
          return false;
        }
      },
      { message: 'Endpoint must be a domain with HTTP/HTTPS protocol and no path' }
    ),
  })
  .and(nameSchema);

export type HttpProxySchema = z.infer<typeof httpProxySchema>;
